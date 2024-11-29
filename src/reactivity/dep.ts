import { Effect } from './effect';

export type Dep = Map<Effect, boolean> & {
  cleanup: () => void;
};

export const createDep = (cleanup: () => void) => {
  const dep = new Map() as Dep;
  dep.cleanup = cleanup;
  return dep;
};
