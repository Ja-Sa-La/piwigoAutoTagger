import {query} from "./dbconn.js";
import axios from "axios";

import {CheckAll, CheckOnce, PiwigoAdminPassword, PiwigoAdminUsername, PiwigoURL, SDAPI, SDAPIAuth} from "./Config.js";


async function processImage(image, cookies) {
    try {
        const imagePath = image.path.replace("./", "");

        const response = await axios.get(`https://${PiwigoURL}/${imagePath}`, {responseType: 'arraybuffer'});
        const imageData = Buffer.from(response.data, 'binary').toString('base64');

        const data = {
            "image": imageData,
            "model": "deepdanbooru"
        };

        const apiUrl = 'http://' + SDAPI + '/sdapi/v1/interrogate';
        const authHeader = 'Basic ' + Buffer.from(SDAPIAuth).toString('base64');

        const apiResponse = await axios.post(apiUrl, data, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            }
        });


        const tagurl = `https://${PiwigoURL}/ws.php?format=json&method=pwg.tags.getAdminList`;
        const getTags = await axios.get(tagurl, {
            headers: {
                Cookie: Object.keys(cookies).map(cookieName => `${cookieName}=${cookies[cookieName]}`).join('; ')
            }
        });

        const tags = apiResponse.data.caption.replaceAll(" ", "").split(",");
        let fulltags = '';
        for (const tag of tags) {
            const tagId = getTagIdByName(getTags.data, tag);
            if (tagId !== null) {
                fulltags += tagId + ",";
            } else {
                const tagCreateUrl = `https://${PiwigoURL}/ws.php?format=json&method=pwg.tags.add&name=${tag}`;
                const createTag = await axios.get(tagCreateUrl);
                fulltags += createTag.data.result.id + ",";
            }
        }

        const updateTagsUrl = `https://${PiwigoURL}/ws.php?format=json`;
        const params = new URLSearchParams();
        params.append('method', 'pwg.images.setInfo');
        params.append('image_id', image.id);
        params.append('tag_ids', fulltags);
        params.append('multiple_value_mode', 'replace');
        await axios.post(updateTagsUrl, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Cookie: Object.keys(cookies).map(cookieName => `${cookieName}=${cookies[cookieName]}`).join('; ')
            }
        });
    } catch (error) {
        console.error(`Error processing image ID ${image.id}:`, error); // Handle errors
    }
}

async function processImagesSequentially() {
    try {
        let output
        if (!CheckAll)
            output = await query("SELECT * FROM piwiai_images img LEFT JOIN piwiai_image_tag tag ON img.id = tag.image_id WHERE tag.image_id IS NULL");
        else
            output = await query("SELECT * FROM piwiai_images");
        console.log("Updating tags on: " + output.length + " images")
        const Cookies = await Login(PiwigoAdminUsername, PiwigoAdminPassword)

        for await (const image of output) {
            await processImage(image, Cookies);
            console.log("ID: " + image.id + " new tags added")
        }
        console.log("Done checking")
    } catch (error) {
        console.error(error); // Handle errors
    }
}

async function Login(username, password) {
    const params = new URLSearchParams();
    params.append('method', 'pwg.session.login');
    params.append('username', username);
    params.append('password', password);

    const LoginUrl = `https://${PiwigoURL}/ws.php?format=json`;

    const apiResponse = await axios.post(LoginUrl, params, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        }
    });
    const pwgIdCookie = apiResponse.headers['set-cookie']
        .find(cookie => cookie.startsWith('pwg_id'))
        .split(';')[0]
        .split('=')[1];

    if (apiResponse.data.stat != "ok")
        throw new Error('failed to login to piwigo');
    else
        console.log("Login successfull")

    return {pwg_id: pwgIdCookie}
}


while (true) {
    await processImagesSequentially();
    if (CheckOnce) {
        process.exit(0);
    } else {
        await new Promise(resolve => {
            console.log("Waiting for an hour...");
            setTimeout(resolve, 60*60 * 1000);
        });
    }
}

function getTagIdByName(jsonData, tagName) {
    const tags = jsonData.result.tags;
    for (let i = 0; i < tags.length; i++) {
        if (tags[i].name === tagName) {
            return tags[i].id;
        }
    }
    return null;
}