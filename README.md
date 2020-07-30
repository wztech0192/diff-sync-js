# js-promise-path-lock

Block the promise chains from executing if the end path is different from the start path. Good for single page application.

## Use Case

In a SPA, when the user enter a page but then quickly navigate away before the promise resolved, this will result in some useless operation. The path lock will stop executing those operation by comparing the browser path when the promise starting against the path when the promise resolved.

## How to install

`npm install js-promise-path-lock`

## How to use

```
import PromisePathLock from 'js-promise-path-lock'

PromisePathLock.lock(axios.get("api/link"))  //pass in your promise object
  .then(...) //won't execute if the browser path is differ from starting
  .catch(...) //won't execute if the browser path is differ from starting
  .finally(...) //won't execute if the browser path is differ from starting
```
