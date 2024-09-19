const { Client } = require("@notionhq/client");
require("dotenv").config();
const cliProgress = require("cli-progress");
const colors = require("ansi-colors");
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
  logLevel: "error",
});

const subjects = {
  "Destiny is All": { id: undefined, items: [], color: "\x1b[31m" },
  "A Vain Death": { id: undefined, items: [], color: "\x1b[38;5;179m" },
  "Premonition of War": { id: undefined, items: [], color: "\x1b[38;5;173m" },
  "Mind and Body": { id: undefined, items: [], color: "\x1b[33m" },
  "Inner Peace": { id: undefined, items: [], color: "\x1b[32m" },
  "Mastery of Games": { id: undefined, items: [], color: "\x1b[34m" },
  "Expressions of Self": { id: undefined, items: [], color: "\x1b[36m" },
  "Ways of the World": { id: undefined, items: [], color: "\x1b[38;5;43m" },
  "Izzet Scholarship": { id: undefined, items: [], color: "\x1b[35m" },
  "Unite Them": { id: undefined, items: [], color: "\x1b[33m" },
  Elsecaller: { id: undefined, items: [], color: "\x1b[38;5;139m" },
};

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

//___MAIN____

const args = process.argv.slice(2);
rechargeDestiny((day = args.length > 0 ? args[0] : undefined));

// Function to delete a block with retries
async function updatePageWithRetry(pageId, updateData, retries = 3) {
  try {
    return await notion.blocks.update({
      block_id: pageId,
      paragraph: updateData,
    });
  } catch (error) {
    if (error.code === "conflict_error" && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
      return updatePageWithRetry(pageId, updateData, retries - 1);
    } else {
      throw error; // If retries exhausted or other error, rethrow
    }
  }
}

// Function to delete a block with retries
async function deleteBlockWithRetries(blockId, maxRetries, progressBar) {
  let retries = maxRetries;
  let success = false;

  while (!success && retries > 0) {
    try {
      await notion.blocks.delete({ block_id: blockId });
      success = true;
      progressBar.increment(1);
    } catch (error) {
      if (error.code === "conflict_error") {
        retries--;
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return deleteBlockWithRetries(blockId, retries, progressBar);
      } else {
        throw error;
      }
    }
  }
  progressBar.stop();
}

async function getClassifications() {
  const response = await fetchBlock(process.env.CLASSIFICATIONS_PAGE_ID);
  let activeSubject = "Destiny is All";
  const fetchedSubjects = response.results
    .filter((r) => r.paragraph && r.paragraph.rich_text.length > 0)
    .map((r) => r.paragraph.rich_text[0].text.content);
  fetchedSubjects.forEach((f) => {
    if (Object.keys(subjects).includes(f)) {
      activeSubject = f;
    } else {
      subjects[activeSubject].items.push(f);
    }
  });
}

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
  progressBar.start(Object.keys(subjects).length, 0);
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
    if (Object.keys(subjects).includes(f.text)) {
      subjects[f.text].id = f.id;
    }
  });

  let activeSubject = undefined;

  for (const f of fetchedSubjects) {
    console.log(`| ${subjects[f.text].color} ${f.text} \x1b[0m\n`);
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
              const result = parseInt(c.text.split(" ")[0]);
              const toAdd = parseInt(debt[i].text.split(" ")[0]);
              const finalText = `${(result + toAdd).toString()} ${
                debt[i].text.split(" ")[1]
              } ${debt[i].text.split(" ")[2]}`;
              await updatePageWithRetry(c.id, {
                rich_text: [
                  {
                    text: {
                      content: finalText,
                    },
                  },
                ],
              });
            }
          }
        })
      );

      // Handle debt items to add new entries
      for (let i = 0; i < debt.length; i++) {
        if (
          activeSubject &&
          subjects[activeSubject].items.includes(debt[i].text.split(" ")[2]) &&
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
          await notion.blocks.children.append({
            block_id: subjects[activeSubject].id,
            children: [todo],
          });
        }
      }
    } else {
      console.log(`${f.text} has no children, moving on...\n`);
    }
  }
  progressBar.update(Object.keys(subjects).length);
  progressBar.stop();
  console.clear();
  console.log(`${colors.green("\n [💸 Destiny Debt] ")} page updated! \n`);
}

async function fetchBlock(blockId) {
  return await notion.blocks.children.list({
    block_id: blockId,
    page_size: 50,
  });
}

function parseChecklist(checklist) {
  return checklist.map((r) => {
    return {
      text: r.to_do.rich_text[0].plain_text,
      checked: r.to_do.checked,
    };
  });
}

async function getChecklist(today) {
  // const isWeekday = today > 0 && today < 6;
  const isSaturday = today === 6;
  const isSunday = today === 0;
  console.log("Getting template checklist...");
  const blocks = await fetchBlock(process.env.CHECKLISTS_PAGE_ID);

  const checklists = await Promise.all(
    blocks.results.map(async (c) => fetchBlock(c.id))
  );
  let index = 0;

  if (isSaturday) {
    index = 1;
  } else if (isSunday) {
    index = 2;
  }

  console.log(
    `Selected template for: ${colors.cyan(
      ["Weekday", "Saturday", "Sunday"][index]
    )} \n`
  );

  const parsedChecklist = parseChecklist(checklists[index].results);

  return parsedChecklist;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  // Delete blocks in parallel
  await Promise.all(
    blockIds.map((blockId) => deleteBlockWithRetries(blockId, 3, progressBar))
  );
}

async function getUncheckedTodos() {
  const blocks = await fetchBlock(process.env.TODAY_PAGE_ID);
  const checklistBlock = await fetchBlock(blocks.results[2].id);

  const filteredBlocks = checklistBlock.results.filter(
    (b) => b.type === "to_do"
  );

  const parsedChecklist = parseChecklist(filteredBlocks).filter(
    (c) => !c.checked
  );

  await removeTodos(filteredBlocks.map((b) => b.id));
  return parsedChecklist;
}

async function refillTodos(checklist) {
  const blocks = await fetchBlock(process.env.TODAY_PAGE_ID);
  const attachBlock = blocks.results[blocks.results.length - 1];

  const todos = checklist.map((c) => {
    return {
      to_do: {
        rich_text: [
          {
            text: {
              content: c.text,
            },
          },
        ],
      },
    };
  });

  await notion.blocks.children.append({
    block_id: attachBlock.id,
    children: todos,
  });

  console.log(`\n ${colors.yellow(`[🎁 Today]`)} page updated! \n`);
}

function startsWithNumber(str) {
  return /^[0-9]/.test(str);
}

async function rechargeDestiny(day = undefined) {
  const checklist = await getChecklist(
    day ? days.indexOf(day) : new Date().getDay()
  );
  const unchecked = await getUncheckedTodos();
  const leftovers = unchecked.filter((u) => startsWithNumber(u.text));
  await refillTodos(checklist);
  await updateDestinyDebt(leftovers);
}
