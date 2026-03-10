/**
 * Converts Craft.js serialized state JSON into TSX source code and import statements.
 *
 * This is a thin facade that re-exports the engine.
 * All component generators are registered via the barrel import.
 */

import "./craftToTsx/generators/index.js";
export { craftStateToTsx } from "./craftToTsx/engine.js";
