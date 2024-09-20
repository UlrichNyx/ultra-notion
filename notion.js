const { Client } = require("@notionhq/client");
/* Helper functions */
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
  logLevel: "error",
});
async function fetchBlock(blockId) {
  return await notion.blocks.children.list({
    block_id: blockId,
    page_size: 50,
  });
}

async function appendBlock(blockId, element) {
  await notion.blocks.children.append({
    block_id: blockId,
    children: element,
  });
}

async function updateBlockWithRetry(pageId, updateData, retries = 5) {
  try {
    return await notion.blocks.update({
      block_id: pageId,
      paragraph: updateData,
    });
  } catch (error) {
    if (error.code === "conflict_error" && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return updateBlockWithRetry(pageId, updateData, retries - 1);
    } else {
      throw error;
    }
  }
}

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
