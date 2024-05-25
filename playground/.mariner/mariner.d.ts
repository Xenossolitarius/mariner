declare module 'navigator:app1' {

  import { Navigator as Navigator_2 } from 'mariner/navigator';
  
  const navigator_2: Navigator_2;
  export { navigator_2 as navigator }
  
  export { }
  
}
declare module 'navigator:app2' {

  import { Navigator as Navigator_2 } from 'mariner/navigator';
  
  const navigator_2: Navigator_2;
  export { navigator_2 as navigator }
  
  export { }
  
}
declare module 'navigator:app3' {

  import { Navigator as Navigator_2 } from 'mariner/navigator';
  
  const navigator_2: Navigator_2;
  export { navigator_2 as navigator }
  
  export { }
  
}
declare module 'navigator:envs' {

  export const MARINER_GLOBAL_VARIABLE: any;
  
  export { }
  
}
declare module 'navigator:shared' {

  import { Pinia } from 'pinia';
  import { StoreDefinition } from 'pinia';
  
  export const pinia: Pinia;
  
  export const useCounter: StoreDefinition<"counter", {
      counter: number;
  }, {}, {
      update(): void;
  }>;
  
  
  export * from "pinia";
  
  export { }
  
}