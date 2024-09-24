# 📝 Ultra Notion (Destiny Recharge Script)

A script to automate task management with Notion, refilling daily to-do lists, updating task statuses, and cleaning up unfinished tasks. This script is designed to enhance productivity by integrating seamlessly with Notion's blocks and templates.

## 🚀 Features

- Automatically update daily tasks on your Notion page.
- Remove unchecked todos from the day’s list.
- Refill the todo list for a new day based on a template defined in a separate Notion page.
- Manage unfinished tasks using a "Destiny Debt" system which keeps track of which tasks you have completed, which not and keeps a tally of them.
- Classify and distribute the unfinished tasks based on their definition

NOTE: The classifications of tasks I have defined follow my own SUBJECTS format and are split into different categories according to their theme e.g.

**Mind and Body** includes things like exercise, meditation etc.

## 📋 Prerequisites

Before using this script, ensure you have the following:

- Node.js installed on your machine.
- A Notion API key and a setup page in Notion for managing your tasks: https://developers.notion.com/
- The following Node.js packages (install them with npm install):
  - dotenv - Load environment variables.
  - cli-progress - Display a progress bar in the terminal.
  - ansi-colors - Colorize terminal output.

## ⚙️ Installation

1. Clone the repository:

```js
git clone https://github.com/UlrichNyx/ultra-notion.git
cd ultra-notion
```

2. Install the necessary dependencies:

```js
npm install
```

3. Create a .env file in the root of the project and add the following variables:

```bash
NOTION_API_KEY=<your-notion-api-key>
TODAY_PAGE_ID=<your-today-page-id>
CHECKLISTS_PAGE_ID=<your-checklists-page-id>
CLASSIFICATIONS_PAGE_ID=<your-classifications-page-id>
DESTINY_DEBT_PAGE_ID=<your-destiny-debt-page-id>
```

4. Set up the helper files as per your task structure in Notion. Ensure that:

- constants.js defines your SUBJECTS structure

## 🛠️ Usage

1. To update the "Destiny" page and manage your daily tasks, simply run the script:

```bash
node index.js
```

By default, it will refill the tasks for the current day. You can also specify a day by passing it as an argument:

```bash
node index.js Monday
```

2. The script will:

- Remove all tasks from your TODAY page
- Refill today's list based on the templates you define in CHECKLISTS
- Update your "Destiny Debt" organized by classifications if any tasks were unfinished

## 📂 Project Structure

```
| ultra-notion/
|
├── src/                        # Main source folder
│   ├── helpers/                # Helper functions and constants
│   │   ├── constants.js        # Stores DAYS and SUBJECTS used in your task list
│   │   ├── helpers.js          # Utility functions for handling tasks (e.g., parseChecklist)
│   │   └── notion.js           # Notion API interaction functions (fetch, update, delete)
│   ├── index.js                 # Main entry point of the script
│
├── .env                        # Environment variables (Notion API key and page IDs)
├── node_modules/               # Installed dependencies
├── .gitignore                  # Files to ignore in version control (e.g., node_modules, .env)
├── package-lock.json           # Locked versions of dependencies
├── package.json                # Project metadata and dependencies
└── README.md                   # Project documentation
```

## 📝 Script Overview

### Main Functions

- **removeUncheckedTodos()**: Fetches and deletes unchecked tasks from the "Today" page.
- **refillTodos(checklist)**: Appends a new todo list for the day based on your template.
- **updateDestinyDebt(debt)**: Updates unfinished tasks in the "Destiny Debt" system.
- **removeTodos(blockIds)**: Deletes todos based on their block IDs.

## 🎨 Example Output

```
Getting template checklist...
Selected template for: Monday

Removing Todos | ████████████████████████████████████████ | 100% || 31/31 items

 [🎁 Today] page updated!

Updating Destiny | ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ | 0% || 0/10 items |  Elsecaller

Updating Destiny | ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ | 10% || 1/10 items |  A Vain Death

Updating Destiny | ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ | 20% || 2/10 items |  Premonition of War

Updating Destiny | ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░ | 30% || 3/10 items |  Mind and Body

Updating Destiny | ████████████████░░░░░░░░░░░░░░░░░░░░░░░░ | 40% || 4/10 items |  Inner Peace

Updating Destiny | ████████████████████░░░░░░░░░░░░░░░░░░░░ | 50% || 5/10 items |  Mastery of Games

Updating Destiny | ████████████████████████░░░░░░░░░░░░░░░░ | 60% || 6/10 items |  Expressions of Self

Updating Destiny | ████████████████████████████░░░░░░░░░░░░ | 70% || 7/10 items |  Ways of the World

Updating Destiny | ████████████████████████████████░░░░░░░░ | 80% || 8/10 items |  Izzet Scholarship

Updating Destiny | ████████████████████████████████████░░░░ | 90% || 9/10 items |  Unite Them

Updating Destiny | ████████████████████████████████████████ | 100% || 10/10 items

 [💸 Destiny Debt]  page updated!

```

## 🛡️ Error Handling

The script implements retry mechanisms (e.g., deleteBlockWithRetries) to handle API request failures and ensure stability during long-running operations.
This is because when updating Notion sequentially there is a very common conflict_error which occurs as Notion tries to save the previous changes you have made.

## 💡 Tips

- Customize the task template and structure in Notion as per your workflow.
- Use this script daily to maintain a clean and up-to-date todo list.
- Your TODAY page needs to have the todo list as a child appended to the 3rd block
- Your classifications need to be in a list of titles followed by the items that belong to that title with the same indentation
- Your check lists need to be expandable lists for each day Monday-Sunday and must be the first 7 children of that page
- In your Destiny Debt page, you must section off each subject and have the todos that belong to that subject be a child of the subject's block
- Your todos must follow the format: -Number- -Unit- -Text- e.g. 1 hour(s) Reading

## 🔮 Future Improvements

Here are some planned enhancements to improve the functionality and user experience of this project:

### 📅 Automated Weekly Recaps:

Automatically generate a weekly summary of tasks completed and remaining, and send it via email or update a designated Notion page. This will provide a snapshot of productivity and areas needing attention.

### ⚡ Dynamic Task Prioritization:

Implement a system that automatically reorders tasks based on urgency, deadlines, or user-defined priorities. This feature would help focus on the most critical tasks first.

### 🔗 Integration with Other Tools:

Expand the script's capabilities by integrating with other project management or productivity tools (e.g., Slack, Google Calendar). This could enhance task tracking and notifications across platforms.

### 📊 Visual Dashboard for Task Progress:

Introduce a visual dashboard (possibly using charts or graphs) to track progress over time, making it easier to see trends and adjust workload accordingly.

## 🤝 Contributing

Contributions are welcome! Feel free to submit a pull request or open an issue if you have suggestions or improvements.

## 📄 License

This project is free for use!

Enjoy :3

~ UlrichNyx
