/**
 * Module: Destiny Recharge Script
 * Author: Filippos Kontogiannis
 * Date: 23rd of September 2024
 *
 * Description:
 * This script automates the process of updating task pages (referred to as "Destiny")
 * and managing to-do lists using Notion. It interacts with Notion blocks, refills todos,
 * updates progress, and removes unchecked items.
 *
 * Dependencies:
 * - dotenv: Used for loading environment variables.
 * - cli-progress: Provides a visual progress bar in the console.
 * - ansi-colors: Adds color to the console outputs for better readability.
 * - helpers/constants.js: Provides constants such as SUBJECTS and DAYS.
 * - helpers/notion.js: Contains methods to interact with Notion API (fetch, update, append blocks).
 * - helpers/helpers.js: Contains utility functions like toDoObject and parseChecklist.
 *
 * Usage:
 * - Run the script by passing an optional argument for the day:
 * - Example: `node main.js Monday` or simply `node main.js`.
 * - Specifying a day will fetch the checklist for the given day and refill the todos for that day
 */

require("dotenv").config();
const cliProgress = require("cli-progress");
const colors = require("ansi-colors");

const { SUBJECTS, DAYS } = require("./helpers/constants.js");

const {
  fetchBlock,
  updateBlockWithRetry,
  deleteBlockWithRetries,
  appendBlock,
} = require("./helpers/notion.js");

const {
  toDoObject,
  parseChecklist,
  textObject,
} = require("./helpers/helpers.js");

//___MAIN____

const args = process.argv.slice(2);
rechargeDestiny((day = args.length > 0 ? args[0] : undefined));

/**
 * Main entry point of the script.
 * Determines the day to update and refills todos.
 *
 * @param {string} [day=undefined] - Optional day parameter (if passed via command line arguments).
 */
async function rechargeDestiny(day = new Date().getDay()) {
  const checklist = await getChecklist(day ?? DAYS.indexOf(day));
  const leftovers = await removeUncheckedTodos();
  await refillTodos(checklist);
  console.log(`\n ${colors.yellow(`[🎁 Today]`)} page updated! \n`);
  await updateDestinyDebt(leftovers);
  console.log(`${colors.green("\n [💸 Destiny Debt] ")} page updated! \n`);
}

/**
 * Fetches the checklist for a given day.
 *
 * @param {number} today - The index of the day to fetch the checklist for.
 * @returns {Promise<Object[]>} - Parsed checklist items for the specified day.
 */
async function getChecklist(today) {
  console.log("Getting template checklist...");
  const blocks = await fetchBlock(process.env.CHECKLISTS_PAGE_ID);
  const checklists = await Promise.all(
    blocks.results.map(async (c) => fetchBlock(c.id))
  );
  console.log(`Selected template for: ${colors.cyan(DAYS[today])} \n`);
  return parseChecklist(checklists[today].results);
}

/**
 * Fetches classification data from Notion and populates the SUBJECTS object.
 * Classifies subjects and their corresponding items.
 */
async function getClassifications() {
  const response = await fetchBlock(process.env.CLASSIFICATIONS_PAGE_ID);
  let activeSubject = "Elsecaller";
  const fetchedSubjects = response.results
    .filter((r) => r.paragraph && r.paragraph.rich_text.length > 0)
    .map((r) => r.paragraph.rich_text[0].text.content);
  fetchedSubjects.forEach((f) => {
    if (Object.keys(SUBJECTS).includes(f)) {
      activeSubject = f;
    } else {
      SUBJECTS[activeSubject].items.push(f);
    }
  });
}

/**
 * Updates Destiny Debt by comparing unchecked todos with the current subject classifications.
 *
 * @param {Object[]} debt - Array of debt items (todos) to be updated in the Destiny Debt page.
 */
async function updateDestinyDebt(debt) {
  await getClassifications();
  const progressBar = new cliProgress.SingleBar(
    {
      format:
        "Updating Destiny | " +
        colors.green("{bar}") +
        " | {percentage}% || {value}/{total} items ",
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic
  );
  progressBar.start(Object.keys(SUBJECTS).length, 0);
  const blocks = await fetchBlock(process.env.DESTINY_DEBT_PAGE_ID);
  const fetchedSubjects = blocks.results
    .filter((r) => r.paragraph && r.paragraph.rich_text.length > 0)
    .map((r) => {
      return {
        text: r.paragraph.rich_text[0].text.content,
        id: r.id,
        has_children: r.has_children,
      };
    });

  fetchedSubjects.forEach((f) => {
    if (Object.keys(SUBJECTS).includes(f.text)) {
      SUBJECTS[f.text].id = f.id;
    }
  });

  let activeSubject = undefined;

  for (const f of fetchedSubjects) {
    console.log(`| ${SUBJECTS[f.text].color} ${f.text} \x1b[0m\n`);
    progressBar.increment(1);
    if (f.has_children) {
      activeSubject = f.text;
      const children = await fetchBlock(f.id);
      const fetchedChildren = children.results
        .filter((r) => r.paragraph && r.paragraph.rich_text.length > 0)
        .map((r) => {
          return {
            text: r.paragraph.rich_text[0].text.content,
            id: r.id,
            has_children: r.has_children,
          };
        });

      await Promise.all(
        fetchedChildren.map(async (c) => {
          for (let i = 0; i < debt.length; i++) {
            if (debt[i].checked) {
              continue;
            }
            if (
              c.text.split(" ")[2] === debt[i].text.split(" ")[2] &&
              !debt[i].checked
            ) {
              debt[i].checked = true;
              // Todos follow the pattern of "<Number> <Units> <Text>"
              const result = parseInt(c.text.split(" ")[0]);
              const toAdd = parseInt(debt[i].text.split(" ")[0]);
              const finalText = `${(result + toAdd).toString()} ${
                debt[i].text.split(" ")[1]
              } ${debt[i].text.split(" ")[2]}`;
              await updateBlockWithRetry(c.id, textObject(finalText));
            }
          }
        })
      );
      for (let i = 0; i < debt.length; i++) {
        if (
          activeSubject &&
          SUBJECTS[activeSubject].items.includes(debt[i].text.split(" ")[2]) &&
          !debt[i].checked
        ) {
          debt[i].checked = true;
          const todo = {
            paragraph: {
              rich_text: [
                {
                  text: {
                    content: debt[i].text,
                  },
                },
              ],
            },
          };
          await appendBlock(SUBJECTS[activeSubject].id, [todo]);
        }
      }
    }
  }
  progressBar.update(Object.keys(SUBJECTS).length);
  progressBar.stop();
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.clear();
}

/**
 * Fetches and removes unchecked todos from today's checklist in Notion.
 *
 * @returns {Promise<Object[]>} - A promise that resolves to a list of unchecked todos
 * with a parsed format (typically for further processing like destiny debt).
 *
 * This function fetches the checklist for the current day from Notion, filters
 * out todos that are unchecked, and removes them from the page. It also ensures
 * that only items starting with a digit (likely prioritized tasks) are removed.
 */
async function removeUncheckedTodos() {
  const blocks = await fetchBlock(process.env.TODAY_PAGE_ID);
  // Grab the third block's children to get the todo list
  const checklistBlock = await fetchBlock(blocks.results[2].id);
  const filteredBlocks = checklistBlock.results.filter(
    (b) => b.type === "to_do"
  );
  const parsedChecklist = parseChecklist(filteredBlocks).filter(
    (c) => !c.checked && /^[0-9]/.test(c.text)
  );
  await removeTodos(filteredBlocks.map((b) => b.id));
  return parsedChecklist;
}

/**
 * Refills the todo list on today's Notion page with new tasks from a checklist.
 *
 * @param {Object[]} checklist - An array of checklist objects where each item contains a `text` property.
 *   - `checklist[]`:
 *     - `text` {string} - The text of the todo item to be added to the Notion page.
 *
 * @returns {Promise<void>} - A promise that resolves once the todos have been appended to the Notion page.
 *
 * This function performs the following steps:
 * 1. Fetches the blocks from the Notion page specified by the `TODAY_PAGE_ID` environment variable.
 * 2. Identifies the block at the end of the page (the last block), which is where new todos will be appended.
 * 3. Converts the checklist items into Notion-compatible todo blocks using `toDoObject`.
 * 4. Appends the newly created todo blocks to the identified block on the Notion page.
 *
 * Example Usage:
 *
 * const checklist = [{ text: "Buy groceries" }, { text: "Clean the house" }];
 * await refillTodos(checklist);
 */
async function refillTodos(checklist) {
  const blocks = await fetchBlock(process.env.TODAY_PAGE_ID);
  const attachBlock = blocks.results[blocks.results.length - 1];
  const todos = checklist.map((c) => toDoObject(c.text));
  await appendBlock(attachBlock.id, todos);
}

/**
 * Removes a list of todos based on provided block IDs.
 * Displays a progress bar to track the deletion process.
 *
 * @param {string[]} blockIds - An array of block IDs representing todos to be deleted.
 *
 * @returns {Promise<void>} - A promise that resolves once all blocks have been deleted.
 *
 * This function iterates over a list of todo block IDs and deletes each block
 * using the `deleteBlockWithRetries` function. The progress of the operation
 * is displayed using a command-line progress bar, which increments after each
 * successful deletion.
 */
async function removeTodos(blockIds) {
  const progressBar = new cliProgress.SingleBar(
    {
      format:
        "Removing Todos | " +
        colors.yellow("{bar}") +
        " | {percentage}% || {value}/{total} items",
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic
  );
  progressBar.start(blockIds.length, 0);

  await Promise.all(
    blockIds.map(async (blockId) => {
      await deleteBlockWithRetries(blockId);
      progressBar.increment(1);
    })
  );
  progressBar.stop();
}
