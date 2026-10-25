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
npm run scene:import
```

It loads the committed house into this device's Pascal and prints the link to open.

## 4. View and edit

Open the printed link. Click **Preview** at the top right to walk through the house. Edits in the editor save to this device's Pascal automatically.

## 5. Save your changes to git

```bash
npm run scene:export
git add scenes
git commit -m "Describe what you changed"
git push
```

`scene:export` writes the house to `scenes/588-m1-interior-v1.json` and copies its 3D object files into `scenes/artifacts`. Commit both.

## 6. Get changes made on another device

```bash
git pull
npm run scene:import
```

Importing replaces this device's copy with the committed one. Export and commit your own edits first, or they are lost.

## Everyday commands

| Task | Command |
|---|---|
| Start Pascal | `npm start` |
| Stop Pascal | `npm stop` |
| Check it is running | `npm run status` |
| Load the committed house | `npm run scene:import` |
| Write your edits to the repo | `npm run scene:export` |

## Notes

- Only one device should edit at a time. Two devices editing between commits means one set of changes overwrites the other.
- The `.pascal/` folder holds the local database and is not in git.
