
const send_button = document.getElementById("send_button");

send_button.addEventListener('click', async(event) => {
    const password = document.getElementById("password").value;
    const message = document.getElementById("message").value;
    console.log(message);

    try {
        const response = await fetch('http://127.0.0.1:5000/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Encryption-Key': password
            },
            body: JSON.stringify(message)
        });

        if (response.status === 201) {
            console.log('Message sent successfully');
        } else {
            console.log('Unexpected status:', response.status);
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
});

const display_button = document.getElementById("display_button");
const place_to_put_return_data = document.getElementById("place_to_put_return_data");

display_button.addEventListener("click", async(event) => {
    const password = document.getElementById("password").value;

    try {
        const response = await fetch('http://127.0.0.1:5000/messages', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Encryption-Key': password
            },
        });
        const data = await response.json();
        console.log(data);
        let log = data.join("\n").replace(/\n/g, "<br>");
        place_to_put_return_data.innerHTML = log;
    } catch(error) {
        console.error('Error retrieving data: ', error);
    }
});

const delete_button = document.getElementById("delete_button");

delete_button.addEventListener("click", async(event) => {
    const password = document.getElementById("password").value;

    try {
        const response = await fetch('http://127.0.0.1:5000/messages', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-Encryption-Key': password
            },
        });
        const data = await response.json();
        console.log(`Deleted ${data.deleted} messages`);
    } catch(error) {
        console.error('Error retrieving data: ', error);
    }
});