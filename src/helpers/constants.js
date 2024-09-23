/**
 * SUBJECTS - An object representing various subjects, each with an associated ID,
 * a list of items (tasks or related elements), and a console color code.
 *
 * - `id`: Initially set to `undefined`, this will store the Notion block ID for the subject.
 * - `items`: An array to store tasks or checklist items associated with the subject.
 * - `color`: A string representing the ANSI color code used for displaying the subject's name
 *   in the terminal (for example, red, yellow, green, etc.).
 *
 * Colors are represented using ANSI escape codes for terminal output.
 * This allows each subject to be displayed with a distinct color.
 */
const SUBJECTS = {
  Elsecaller: { id: undefined, items: [], color: "\x1b[38;5;139m" },
  "A Vain Death": { id: undefined, items: [], color: "\x1b[38;5;179m" },
  "Premonition of War": { id: undefined, items: [], color: "\x1b[38;5;173m" },
  "Mind and Body": { id: undefined, items: [], color: "\x1b[33m" },
  "Inner Peace": { id: undefined, items: [], color: "\x1b[32m" },
  "Mastery of Games": { id: undefined, items: [], color: "\x1b[34m" },
  "Expressions of Self": { id: undefined, items: [], color: "\x1b[36m" },
  "Ways of the World": { id: undefined, items: [], color: "\x1b[38;5;43m" },
  "Izzet Scholarship": { id: undefined, items: [], color: "\x1b[35m" },
  "Unite Them": { id: undefined, items: [], color: "\x1b[33m" },
};

/**
 * DAYS - An array representing the days of the week.
 *
 * Each string represents a day, starting from Sunday to Saturday.
 * This is typically used to assign or manage tasks on a per-day basis.
 */
const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

module.exports = { SUBJECTS, DAYS };
