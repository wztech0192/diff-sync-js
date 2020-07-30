# diff-sync-js

A JavaScript implementation of Neil Fraser Differential Synchronization Algorithm

Diff Sync Writing: https://neil.fraser.name/writing/sync/

## Use Case

Differential synchronization algorithm keep two or more copies of the same document synchronized with each other in real-time. The algorithm offers scalability, fault-tolerance, and responsive collaborative editing across an unreliable network.

## How to install

`npm install diff-sync-js`

## How to use

```
import PromisePathLock from 'js-promise-path-lock'

PromisePathLock.lock(axios.get("api/link"))  //pass in your promise object
  .then(...) //won't execute if the browser path is differ from starting
  .catch(...) //won't execute if the browser path is differ from starting
  .finally(...) //won't execute if the browser path is differ from starting
```
