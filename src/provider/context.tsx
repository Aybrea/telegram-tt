import { createContext } from '../lib/teact/teact';

export const LeftMainContext = createContext<{
  handleSelectContacts:() => void;
}>();
