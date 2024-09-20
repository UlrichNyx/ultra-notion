function parseChecklist(checklist) {
  return checklist.map((r) => {
    return {
      text: r.to_do.rich_text[0].plain_text,
      checked: r.to_do.checked,
    };
  });
}

function toDoObject(text) {
  return {
    to_do: {
      rich_text: [
        {
          text: {
            content: text,
          },
        },
      ],
    },
  };
}

function textObject(text) {
  return {
    rich_text: [
      {
        text: {
          content: text,
        },
      },
    ],
  };
}

module.exports = { parseChecklist, toDoObject, textObject };
