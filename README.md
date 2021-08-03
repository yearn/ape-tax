# Ape Tax 🦍🧮

If you want to run the UI yourself, check the following steps:

## Project setup

```bash
npm install
```

### Compiles and hot-reloads for development

```bash
npm run serve
```

### Compiles and minifies for production

```bash
npm run build
```

### Lints and fixes files

```bash
npm run lint
```

## Add an experimental experiment

To add a new vault to the list, you need to run the following command : `node scripts/newVault.js --fast`.  
This will prompt you with several information:  
- What's the name of your vault ? (*ex: Hardrock Farmer*)
- What's the logo for your vault ? (*ex: 🎸👨‍🌾*)
- Which chain ? (*oneOf: Mainnet (1), BSC (56), Polygon (137), Fantom Opera (250)*)
- What's the address of your vault ? (*ex: 0x33bd0f9618cf38fea8f7f01e1514ab63b9bde64b*)
- Who is the dev of this vault ? (*ex: emilianobonassi*)
