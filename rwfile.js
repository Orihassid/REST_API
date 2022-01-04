const fs = require("fs").promises;


async function is_exists( path )
{
    try {
        const stat = await fs.stat( path )
        return true;
    }
    catch( e )
    {
        return false;
    }    
}




async function save_to_file(file_name,g_users){
  await fs.writeFile(file_name, JSON.stringify(g_users));
}

async function read_from_file()
{
    const file = await fs.readFile("users.json");
    g_users = JSON.parse(file);
    return g_users;
}






module.exports = {
    save_to_file: save_to_file,
    read_from_file: read_from_file,
    is_exists: is_exists,
}






   
    