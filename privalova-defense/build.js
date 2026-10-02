const { pres, THEME, applyTheme } = require("./lib");
const intro = require("./s_intro");
const p1 = require("./s_p1");
const { p2, p3, conclusions } = require("./s_p2p3");

intro();
p1();
p2();
p3();
conclusions();

const out = __dirname + "/Privalova_dissertation_defense.pptx";
pres.writeFile({ fileName: out }).then(() => applyTheme(out, THEME)).then(() => console.log("written", out));
