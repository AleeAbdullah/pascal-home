# Run the 588 M1 house on another device

Needs Node.js 22.13 or newer and git. Works on macOS, Linux and Windows.

## 1. Get the project

```bash
git clone https://github.com/AleeAbdullah/pascal-home.git
cd pascal-home
npm install
```

## 2. Start Pascal

```bash
npm start
```

It prints the editor address, for example `http://pascal.localhost:61617`.

## 3. Load the house

```bash
node scripts/import-scene.mjs
```

It loads `scenes/588-m1-interior-v1.json` and its compiled objects into this machine's Pascal. Then it prints the link to open.

## 4. View it

Open the printed link. Click **Preview** at the top right to walk through the house.

## Everyday commands

| Task | Command |
|---|---|
| Start Pascal | `npm start` |
| Stop Pascal | `npm stop` |
| Check it is running | `npm run status` |
| Reload the house after a `git pull` | `node scripts/import-scene.mjs` |

## Notes

- Each device keeps its own copy. Edits on one device do not reach the others until the scene is exported, committed and pulled, then imported again.
- Re-importing replaces that device's copy of the house with the committed one.
- The `.pascal/` folder holds the local database and is not in git.
