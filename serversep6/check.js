import { fortaledetails } from "./decision.ts";

const sample = async () => {
    const discussion =
        "We are planning a project with title - blaballa";
    const response = await fortaledetails(discussion);

    console.log(JSON.stringify(response, null, 2));
};

sample().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});