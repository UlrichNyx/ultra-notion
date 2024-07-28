const { Client } = require("@notionhq/client");
require("dotenv").config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function fetchBlock(blockId) {
  return await notion.blocks.children.list({
    block_id: blockId,
    page_size: 50,
  });
}

const cliProgress = require("cli-progress");
const colors = require("ansi-colors");

// Create a new progress bar instance
/*
// Get all of the destiny debt
(async () => {
  const response = await fetchBlock(process.env.DESTINY_DEBT_PAGE_ID);
  response.results.forEach(async (obj) => {
    if (obj.type === "toggle") {
      const toggleList = await fetchBlock(obj.id);
      toggleList.results.forEach(async (listItem) => {
        console.log(listItem.paragraph.rich_text[0].plain_text);
      });
    }
  });
})();
*/

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
  const content = await fetchBlock(blocks.results[0].id);
  const todos = content.results
    .map((b) => {
      return { text: b.paragraph?.rich_text[0]?.plain_text, id: b.id };
    })
    .filter((t) => t.text);

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
  const response = await notion.blocks.children.append({
    block_id: blocks.results[0].id,
    children: toAppend,
  });
  progressBar.update(leftovers.length);
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
rechargeDestiny((day = args.length > 0 ? args[0] : undefined));
// Keep unchecked todos
// Go to the respective place in Destiny Debt and increment text

// Remove all todos
