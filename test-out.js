// test.js
fetch("https://codepen.io/vadymhimself/pen/zYGvroM.css").then((r) => r.text()).then((t) => console.log("CSS:\n", t.substring(0, 1e3)));
fetch("https://codepen.io/vadymhimself/pen/zYGvroM.html").then((r) => r.text()).then((t) => console.log("HTML:\n", t));
