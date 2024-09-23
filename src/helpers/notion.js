const { Client } = require("@notionhq/client");
/* Helper functions */
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
  logLevel: "error", // Set log level to 'error' to suppress unnecessary logs
});

/**
 * Fetches the children blocks of a specific block in Notion.
 *
 * @param {string} blockId - The ID of the block whose children you want to fetch.
 *
 * @returns {Promise<Object>} - A promise that resolves to a list of child blocks.
 *
 * This function retrieves up to 50 child blocks from the specified parent block in Notion.
 */
async function fetchBlock(blockId) {
  return await notion.blocks.children.list({
    block_id: blockId,
    page_size: 50,
  });
}

/**
 * Appends new blocks to a specific parent block in Notion.
 *
 * @param {string} blockId - The ID of the parent block where new children will be added.
 * @param {Object[]} element - An array of block elements to append.
 *
 * @returns {Promise<void>} - A promise that resolves once the blocks have been appended.
 *
 * This function adds new children blocks (e.g., todos, paragraphs) to a specific block in Notion.
 */
async function appendBlock(blockId, element) {
  await notion.blocks.children.append({
    block_id: blockId,
    children: element,
  });
}

/**
 * Updates a block in Notion with retry logic to handle conflict errors.
 *
 * @param {string} blockId - The ID of the block to update.
 * @param {Object} updateData - The new data for the block (typically a paragraph or rich text).
 * @param {number} retries - The number of retry attempts in case of a conflict error (default: 5).
 *
 * @returns {Promise<Object>} - A promise that resolves to the updated block.
 *
 * This function attempts to update a block with retry logic to handle potential API conflict errors.
 * If a conflict occurs (e.g., another update to the same block), it retries up to 5 times with a delay.
 */
async function updateBlockWithRetry(blockId, updateData, retries = 5) {
  try {
    return await notion.blocks.update({
      block_id: blockId,
      paragraph: updateData,
    });
  } catch (error) {
    if (error.code === "conflict_error" && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return updateBlockWithRetry(blockId, updateData, retries - 1);
    } else {
      throw error;
    }
  }
}

/**
 * Deletes a block in Notion with retry logic to handle conflict errors.
 *
 * @param {string} blockId - The ID of the block to delete.
 * @param {number} retries - The number of retry attempts in case of a conflict error (default: 5).
 *
 * @returns {Promise<void>} - A promise that resolves once the block has been successfully deleted.
 *
 * This function attempts to delete a block in Notion with retry logic. If a conflict error occurs,
 * it retries up to 5 times with a delay before giving up and throwing an error.
 */
async function deleteBlockWithRetries(blockId, retries = 5) {
  try {
    await notion.blocks.delete({ block_id: blockId });
  } catch (error) {
    if (error.code === "conflict_error" && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return deleteBlockWithRetries(blockId, retries - 1);
    } else {
      throw error;
    }
  }
}

module.exports = {
  fetchBlock,
  updateBlockWithRetry,
  deleteBlockWithRetries,
  appendBlock,
};
