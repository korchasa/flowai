// Technical Debt: single isolated TODO without urgency markers — Low per rubric
// Cat 4 (single TODO, no XXX/HACK/FIXME, no cluster).
import { trim } from "./utils/format.ts";
import { dispatch, type Handler } from "./silent_catch.ts";
import { slug } from "./misplaced_helper.ts";

// TODO: wire up real persistence layer
export function run(input: string): string {
  const cleaned = trim(input);
  const handler: Handler = (e) => {
    console.log(e.type);
  };
  dispatch(handler, { type: "input", payload: cleaned });
  return slug(cleaned);
}
