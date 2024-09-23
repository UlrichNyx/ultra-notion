/**
 * Parses a Notion checklist into an array of todo objects.
 *
 * @param {Object[]} checklist - An array of checklist items from Notion,
 * typically fetched from a Notion page block.
 *
 * @returns {Object[]} - An array of parsed checklist items where each item has:
 *   - `text`: The plain text of the todo item.
 *   - `checked`: Boolean indicating whether the todo is checked or not.
 *
 * This function extracts the plain text and the checked state from each
 * checklist item, returning them as a simplified object.
 */
function parseChecklist(checklist) {
  return checklist.map((r) => {
    return {
      text: r.to_do.rich_text[0].plain_text,
      checked: r.to_do.checked,
    };
  });
}

/**
 * Creates a Notion-compatible todo object from a given text.
 *
 * @param {string} text - The content of the todo item to create.
 *
 * @returns {Object} - A Notion-formatted todo object with the following structure:
 *   - `to_do`:
 *     - `rich_text`:
 *       - `text`:
 *         - `content`: The plain text of the todo item.
 *
 * This function is used to create new todo blocks that can be added to a Notion page.
 */
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

/**
 * Creates a Notion-compatible rich text object from a given text.
 *
 * @param {string} text - The content of the text block.
 *
 * @returns {Object} - A Notion-formatted rich text object:
 *   - `rich_text`:
 *     - `text`:
 *       - `content`: The plain text content.
 *
 * This function is used to create rich text blocks for Notion that can be
 * appended or updated in existing blocks.
 */
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
