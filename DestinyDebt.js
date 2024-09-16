const { Client } = require("@notionhq/client");
require("dotenv").config();
const cliProgress = require("cli-progress");
const colors = require("ansi-colors");
const notion = new Client({ auth: process.env.NOTION_API_KEY });

const subjects = {
  "Destiny is All": { id: undefined, items: [] },
  "A Vain Death": { id: undefined, items: [] },
  "Premonition of War": { id: undefined, items: [] },
  "Mind and Body": { id: undefined, items: [] },
  "Inner Peace": { id: undefined, items: [] },
  "Mastery of Games": { id: undefined, items: [] },
  "Expressions of Self": { id: undefined, items: [] },
  "Ways of the World": { id: undefined, items: [] },
  "Izzet Scholarship": { id: undefined, items: [] },
  "Unite Them": { id: undefined, items: [] },
  Elsecaller: { id: undefined, items: [] },
};

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

async function getClassificationIDs(debt) {
  await getClassifications();
  const blocks = await fetchBlock(process.env.DESTINY_DEBT_PAGE_ID);
  let activeSubject = "Destiny is All";
  const fetchedSubjects = blocks.results
    .filter((r) => r.paragraph && r.paragraph.rich_text.length > 0)
    .map((r) => {
      return { text: r.paragraph.rich_text[0].text.content, id: r.id };
    });
  fetchedSubjects.forEach((f) => {
    if (Object.keys(subjects).includes(f.text)) {
      activeSubject = f.text;
      subjects[activeSubject].id = f.id;
    }
    // Check if for any debt item there is a match between Object.keys(subjects).map((k) => subjects[k].items).includes(debt.split(" ")[2])
    // If yes, increment the number of the existing debt
    // If not, append it underneath
  });
  console.log(subjects);
}

async function matchExistingDebt(debt) {
  const blocks = await fetchBlock(process.env.DESTINY_DEBT_PAGE_ID);
  let activeSubject = "Destiny is All";
  const fetchedSubjects = blocks.results
    .filter((r) => r.paragraph && r.paragraph.rich_text.length > 0)
    .map((r) => {
      return { text: r.paragraph.rich_text[0].text.content, id: r.id };
    });
  fetchedSubjects.forEach((f) => {
    if (Object.keys(subjects).includes(f.text)) {
      activeSubject = f.text;
    } else {
      subjects[activeSubject].id = f.id;
    }
  });
  console.log(subjects);
}

async function fetchBlock(blockId) {
  return await notion.blocks.children.list({
    block_id: blockId,
    page_size: 50,
  });
}

async function getTodosFromBlocks(blocks) {
  const filteredBlocks = blocks.results
    .filter(
      (block) =>
        block.type === "paragraph" && block.paragraph.rich_text.length > 0
    )
    .map((b) => {
      return { text: b.paragraph.rich_text[0].text.content, id: b.id };
    });
  const regex =
    /(\d+)\s*(hour\(s\)|hours?|minute\(s\)|minutes?)\s+([\w\s/-]+)/i;

  const matches = filteredBlocks
    .filter((b) => b.text.match(regex))
    .filter(Boolean);

  return matches;
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
  const isWeekday = today > 0 && today < 6;
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
    )}`
  );

  const parsedChecklist = parseChecklist(checklists[index].results);

  return parsedChecklist;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function removeTodos(blockIds) {
  console.log("Removing previous todos...");
  const progressBar = new cliProgress.SingleBar(
    {
      format:
        "Removing Todos |" +
        colors.yellow("{bar}") +
        "| {percentage}% || {value}/{total} items",
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic
  );
  progressBar.start(blockIds.length, 0);

  for (let i = 0; i < blockIds.length; i++) {
    progressBar.increment();
    const response = await notion.blocks.delete({ block_id: blockIds[i] });
    await sleep(1);
  }
  progressBar.stop();
  console.log("Removed all unchecked todos!");
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
  console.log(`Removed ${parsedChecklist.length} todos`);
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

  const response = await notion.blocks.children.append({
    block_id: attachBlock.id,
    children: todos,
  });

  console.log(`\x1b[33m[🎁 Today]\x1b[37m page updated!`);
}

async function updateDestinyDebt(leftovers) {
  const progressBar = new cliProgress.SingleBar(
    {
      format:
        "Updating destiny |" +
        colors.green("{bar}") +
        "| {percentage}% || {value}/{total} items",
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic
  );
  progressBar.start(leftovers.length, 0);
  const blocks = await fetchBlock(process.env.DESTINY_DEBT_PAGE_ID);
  const todos = await getTodosFromBlocks(blocks);

  for (let i = 0; i < todos.length; i++) {
    progressBar.increment();
    for (let j = 0; j < leftovers.length; j++) {
      if (
        todos[i].text.split(" ")[1] + todos[i].text.split(" ")[2] ===
        leftovers[j].text.split(" ")[1] + leftovers[j].text.split(" ")[2]
      ) {
        try {
          progressBar.increment();
          const result = parseInt(todos[i].text.split(" ")[0]);
          const toAdd = parseInt(leftovers[j].text.split(" ")[0]);
          const finalText = `${(result + toAdd).toString()} ${
            todos[i].text.split(" ")[1]
          } ${todos[i].text.split(" ")[2]}`;
          leftovers[j].checked = true;
          await notion.blocks.update({
            block_id: todos[i].id,
            paragraph: {
              rich_text: [
                {
                  text: {
                    content: finalText,
                  },
                },
              ],
            },
          });
          await sleep(1);
        } catch (error) {
          console.error("Error updating block:", error);
        }
      }
    }
  }

  const toAppend = leftovers
    .filter((l) => !l.checked)
    .map((c) => {
      return {
        paragraph: {
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
  let counter = 0;
  /*
  const response = await notion.blocks.children.append({
    block_id: blocks.results[0].id,
    children: toAppend,
  });
  */
  await getClassificationIDs();
  // For each toAppend
  //  If there is a match with an item, increment the number
  //  Otherwise, find the subject the item belongs to and add it beneath it
  //  Need to increase counter to update progressbar
  progressBar.update(toAppend.length);
  progressBar.stop();
  console.log(`${colors.green("[💸 Destiny Debt] ")} page updated!`);
}

function startsWithNumber(str) {
  return /^[0-9]/.test(str);
}

async function rechargeDestiny(day = undefined) {
  // Get content from Checklists page
  // If it is a weekday today, load the weekday checklist and so on

  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const checklist = await getChecklist(
    day ? days.indexOf(day) : new Date().getDay()
  );
  // Go on Today
  // Check if Today has any remaining todos which have not been checked
  const unchecked = await getUncheckedTodos();
  const leftovers = unchecked.filter((u) => startsWithNumber(u.text));
  await refillTodos(checklist);
  await updateDestinyDebt(leftovers);
}

const args = process.argv.slice(2);
//rechargeDestiny((day = args.length > 0 ? args[0] : undefined));

getClassificationIDs();
