const button1 = document.getElementById("button1");
const fullScreenGif = document.getElementById("fullscreen-gif");
const message = document.querySelector("#message");
const addIdeaButton = document.getElementById("add-idea");
const ideasList = document.querySelector("ul");

button1.addEventListener("click", () => {
    fullScreenGif.classList.add("show");
    message.textContent = "Surprise activated!";
    button1.textContent = "Surprise Activated";

    setTimeout(() => {
        fullScreenGif.classList.remove("show");
        message.textContent = "Click the button to reveal a surprise.";
        button1.textContent = "Press for a Surprise";
    }, 3000);
});

addIdeaButton.addEventListener("click", () => {
    const newIdea = document.createElement("li");
    newIdea.textContent = "Piano Practice Tracker";
    ideasList.appendChild(newIdea);
    addIdeaButton.disabled = true;
});

let h1 = document.querySelector("h1");
console.log(h1);