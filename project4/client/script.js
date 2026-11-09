const API = 'http://127.0.0.1:5000'

const NUMBER_FIELDS = ["diameter_km", "mass_kg", "orbital_period_days", "avg_temp_c"];
const TEXT_FIELDS = ["parent_body", "img_url", "description"];
const NASA_SEARCH_URL = "https://images-api.nasa.gov/search";
const nasaCache = new Map();

const $ = (id) => document.getElementById(id);
const newForm = $("new_object");
const updateForm = $("update_object");

async function api(method, path, body) {
    const options = {method, headers: {}};
    if (body !== undefined) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
    }
    let response;
    try {
        response = await fetch (API + path, options);
    } catch {
        throw new Error("The server is not working, fix it.");
    }

    if (response.status === 204) {
        return null;
    }

    let data = null;
    try {
        data = await response.json();
    } catch {
        data = null;
    }
    if (!response.ok) {
        let message = `Request failed (${response.status})`;
        
        if (data !== null && data.message) {
            message = data.message;
        }
        throw new Error(message);
    }
    return data;
}

const bodyPath = (name) => `/bodies/${encodeURIComponent(name)}`;

function say(text, isError = false) {
    const content = $("message");
    content.textContent = text;
    if (isError){
        content.className = "error";
    } else {
        content.className = "success";
    }
}

// Returns the field's text with surrounding spaces removed, or "" if missing.
function getText(formData, field) {
    const value = formData.get(field);
    if (value === null) {
        return "";
    }
    return value.trim();
}

function searchName(name) {
    return name.replace(/^\d+[A-Z]?\//, "").trim();
}

function titleMentions(title, name) {
    const words = title.toLowerCase().match(/[a-z0-9]+/g) || [];
    return words.includes(name.toLowerCase());
}

async function findNasaImage(name, type) {
    const base = searchName(name);
    const cacheKey = `${base}|${type}`.toLowerCase();
    if (nasaCache.has(cacheKey)) {
        return nasaCache.get(cacheKey);
    }

    const params = new URLSearchParams({
        q: `${base} ${type}`,
        media_type: "image",
        page_size: "10",
    });

    let imageUrl = null;
    try {
        const response = await fetch (`${NASA_SEARCH_URL}?${params}`);
        if (response.ok) {
            const data = await response.json();
            for (const item of data.collection.items) {
                const title = item.data[0].title;
                const hasImage = item.links && item.links.length > 0;
                if (hasImage && titleMentions(title, base)) {
                    imageUrl = item.links[0].href;
                    break;
                }
            }
        }
    } catch {
        imageUrl = null;
    }
    nasaCache.set(cacheKey, imageUrl);
    return imageUrl;
}

async function checkNasa(form) {
    const name = getText(new FormData(form), "name");
    const type = form.elements.namedItem("type").value;

    if (name === "" || type === "") {
        say("Enter a name and choose a type first.", true);
        return;
    }
    say(`Searching NASA for ${name}...`);
    const imageUrl = await findNasaImage(name, type);

    if (imageUrl === null) {
        say(`No relevant NASA image found for ${name}.`, true);
        return;
    }
    form.elements.namedItem("img_url").value = imageUrl;
    say(`Found an image for ${name}`);
}

function formToBody(form) {
    const data = new FormData(form);
    const body = {
        name: getText(data, "name"),
        type: data.get("type"),
    };

    for (const field of NUMBER_FIELDS) {
        const value = getText(data, field);
        if (value === "") {
            body[field] = null;
        } else {
            body[field] = Number(value);
        }
    }

    for (const field of TEXT_FIELDS) {
        const value = getText(data, field);
        if (value === "") {
            body[field] = null;
        } else {
            body[field] = value;
        }
    }

    return body;
}

function fillForm(form, body) {
    form.elements.namedItem("name").value = body.name;
    form.elements.namedItem("type").value = body.type;
    for (const field of NUMBER_FIELDS) {
        form.elements.namedItem(field).value = body[field] ?? "";
    }
    for (const field of TEXT_FIELDS) {
        form.elements.namedItem(field).value = body[field] ?? "";
    }
}

function showForm(which) {
    newForm.hidden = which !== "new";
    updateForm.hidden = which !== "update";
}

function makeButton(label, onClick, className = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
}

const TYPE_GROUPS = [
    {type: "star", title: "Stars"},
    {type: "planet", title: "Planets"},
    {type: "dwarf planet", title: "Dwarf Planets"},
    {type: "moon", title: "Moons"},
    {type: "comet", title: "Comets"},
    {type: "asteroid", title: "Asteroids"},
];

// Readable names (with units) for the fields shown in the detail view.
const FIELD_LABELS = {
    name: "Name",
    type: "Type",
    parent_body: "What does it orbit?",
    diameter_km: "Diameter (km)",
    mass_kg: "Mass (kg)",
    orbital_period_days: "Orbital Period (days)",
    avg_temp_c: "Average Temperature (\u00B0C)",
    img_url: "Image URL",
    description: "Description",
};

// Which type cards are open, so a refresh after an edit doesn't collapse them.
const openCards = new Set();

// Fills the detail box with a label and value for each field.
function renderDetail(box, body) {
    box.replaceChildren();
    for (const [field, label] of Object.entries(FIELD_LABELS)) {
        const term = document.createElement("dt");
        term.textContent = label;

        const value = document.createElement("dd");
        if (body[field] === null || body[field] === undefined) {
            value.textContent = "Unknown";
        } else {
            value.textContent = body[field];
        }

        box.append(term, value);
    }
}

function makeBodyItem(body) {
    const item = document.createElement("li");
    const row = document.createElement("div");
    row.className = "body-row";
    const text = document.createElement("span");
    text.textContent = `${body.name} (${body.type}), ${body.diameter_km} km`;

    // The View button fills this in and shows it directly under the row.
    const detail = document.createElement("dl");
    detail.className = "body-detail";
    detail.hidden = true;

    // The Edit button moves the update form into this slot, under the row.
    const editSlot = document.createElement("div");
    editSlot.className = "body-edit";

    if (body.img_url) {
        const picture = document.createElement("img");
        picture.src = body.img_url;
        picture.alt = body.name;
        picture.width = 64;
        picture.height = 64;
        picture.loading = "lazy";
        // If the image can't load, drop it so no broken-image icon shows.
        picture.addEventListener("error", () => picture.remove());
        row.append(picture);
    }

    row.append(
        text,
        makeButton("View", () => showDetail(body.name, detail)),
        makeButton("Edit", () => startEdit(body.name, editSlot, detail)),
        makeButton("Delete", () => removeBody(body.name), "danger"),
    );
    item.append(row, detail, editSlot);
    return item;
}

function makeTypeCard(group, members) {
    const card = document.createElement("details");
    card.className = "type-card";
    card.dataset.type = group.type;   // the stylesheet colors each type differently
    card.open = openCards.has(group.type);
    card.addEventListener("toggle", () => {
        if (card.open) {
            openCards.add(group.type);
        } else {
            openCards.delete(group.type);
        }
    });

    const heading = document.createElement("summary");
    heading.textContent = `${group.title} (${members.length})`;

    const items = document.createElement("ul");
    for (const body of members) {
        items.append(makeBodyItem(body));
    }

    card.append(heading, items);
    return card;
}

function renderList(bodies) {
    const list = $("body_list");

    // Put the update form back in its home first, or rebuilding the list would delete it.
    $("update_home").append(updateForm);
    updateForm.hidden = true;

    list.replaceChildren();
    for (const group of TYPE_GROUPS) {
        const members = bodies.filter((body) => body.type === group.type);
        if (members.length > 0) {
            list.append(makeTypeCard(group, members));
        }
    }
}

async function loadList() {
    try {
        renderList(await api("GET", "/bodies"));
    } catch (err) {
        say (err.message, true);
    }
}

async function showDetail(name, detailBox) {
    showForm("none");

    // Clicking View again closes it.
    if (!detailBox.hidden) {
        detailBox.hidden = true;
        return;
    }

    try {
        const body = await api("GET", bodyPath(name));
        renderDetail(detailBox, body);
        detailBox.hidden = false;
    } catch (err) {
        say(err.message, true);
    }
}

async function removeBody(name) {
    showForm("none");
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
        await api("DELETE", bodyPath(name));
        say (`Deleted ${name}.`);
        await loadList();
    } catch (err) {
        say(err.message, true);
    }
}

newForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
        const created = await api("POST", "/bodies", formToBody(newForm));
        say (`Created ${created.name}.`);
        newForm.reset();
        await loadList();
    } catch (err) {
        say(err.message, true);
    }
});

updateForm.addEventListener("submit", async(event) =>{
    event.preventDefault();
    const original = $("existing_name").value.trim();
    try {
        const updated = await api("PUT", bodyPath(original), formToBody(updateForm));
        say (`Updated ${updated.name}.`);
        $("existing_name").value = updated.name;
        await loadList();
    } catch (err) {
        say(err.message, true);
    }
});

$("update_cancel").addEventListener("click", () => showForm("none"));

$("new").addEventListener("click", () => {newForm.reset(); showForm("new");})

$("new_check_nasa").addEventListener("click", () => checkNasa(newForm));
$("update_check_nasa").addEventListener("click", () => checkNasa(updateForm));

async function startEdit(name, editSlot, detailBox) {
    try {
        const body = await api("GET", bodyPath(name));
        fillForm(updateForm, body);
        $("existing_name").value = body.name;

        detailBox.hidden = true;        // the form takes the detail's place
        editSlot.append(updateForm);    // moves the form under this row
        showForm("update");
        updateForm.scrollIntoView({block: "nearest"});
    } catch (err) {
        say(err.message, true);
    }
}

showForm("none");
loadList();