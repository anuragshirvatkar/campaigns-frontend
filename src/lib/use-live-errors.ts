import { useState } from "react";

type Errors<K extends string> = Partial<Record<K, string>>;

/**
 * Form errors that stay quiet until the first submit, then track the values live: each message
 * disappears as soon as its field is valid. Errors from the server stay until that field is edited.
 */
export function useLiveErrors<K extends string>(validate: () => Errors<K>) {
  const [attempted, setAttempted] = useState(false);
  const [server, setServer] = useState<Errors<K>>({});
  const live = attempted ? validate() : {};
  const errors: Errors<K> = { ...server, ...live };

  return {
    errors,
    /** Call on submit: shows errors from now on and returns true when the form is valid. */
    check: () => {
      setAttempted(true);
      return Object.keys(validate()).length === 0;
    },
    setServerErrors: setServer,
    /** Call when a field changes, so a server error on it goes away. */
    edited: (field: K) => {
      if (server[field]) setServer((s) => ({ ...s, [field]: undefined }));
    },
    reset: () => {
      setAttempted(false);
      setServer({});
    },
  };
}
