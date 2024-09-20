require("dotenv").config();
const cliProgress = require("cli-progress");
const colors = require("ansi-colors");

const { SUBJECTS, DAYS } = require("./constants.js");

const {
  fetchBlock,
  updateBlockWithRetry,
  deleteBlockWithRetries,
  appendBlock,
} = require("./notion.js");

const { toDoObject, parseChecklist, textObject } = require("./helpers.js");

//___MAIN____

const args = process.argv.slice(2);
rechargeDestiny((day = args.length > 0 ? args[0] : undefined));

async function rechargeDestiny(day = new Date().getDay()) {
  const checklist = await getChecklist(day ?? DAYS.indexOf(day));
  const leftovers = await removeUncheckedTodos();
  await refillTodos(checklist);
  console.log(`\n ${colors.yellow(`[🎁 Today]`)} page updated! \n`);
  await updateDestinyDebt(leftovers);
  console.log(`${colors.green("\n [💸 Destiny Debt] ")} page updated! \n`);
}

async function getChecklist(today) {
  console.log("Getting template checklist...");
  const blocks = await fetchBlock(process.env.CHECKLISTS_PAGE_ID);
  const checklists = await Promise.all(
    blocks.results.map(async (c) => fetchBlock(c.id))
  );
  console.log(`Selected template for: ${colors.cyan(DAYS[today])} \n`);
  return parseChecklist(checklists[today].results);
}

async function getClassifications() {
  const response = await fetchBlock(process.env.CLASSIFICATIONS_PAGE_ID);
  let activeSubject = "Destiny is All";
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

async function removeUncheckedTodos() {
  const blocks = await fetchBlock(process.env.TODAY_PAGE_ID);
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

async function refillTodos(checklist) {
  const blocks = await fetchBlock(process.env.TODAY_PAGE_ID);
  const attachBlock = blocks.results[blocks.results.length - 1];
  const todos = checklist.map((c) => toDoObject(c.text));
  await appendBlock(attachBlock.id, todos);
}
