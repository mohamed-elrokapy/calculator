let myinput = document.querySelector("#myinput");
let mybuttons = document.querySelectorAll(" button");
mybuttons.forEach((ele) => {
  ele.addEventListener("click", () => {
    ele.innerHTML == "del"
      ? (myinput.value = "")
      : ele.innerHTML == "="
      ? (myinput.value = eval(myinput.value))
      : (myinput.value += ele.innerHTML);
  });
});
