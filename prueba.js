const perro = () => {
  setTimeout(() => {
    i = 5;
  }, 5000);
};
let i;
async function koko() {
  const miau = await perro();
  console.log("dentro 2");
}
koko();
console.log(i);
