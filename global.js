const StatusCodes = require('http-status-codes').StatusCodes;
let token_map = new Map()
let g_users=[]
let g_posts = []
let g_msgs = []


function get_active_user(req)
{ 
	const token = req.headers.authorization;
	let user = token_map.get(token);
    
	if(!user || user.status != 'active')
	{
		return undefined;
	}
	return user;
}

function check_if_user_defined(user,res)
{
	if(!user)
	{
        res.status(StatusCodes.BAD_REQUEST);
		res.send("invalid token");
	} 
}

function create_date_time(){
const today = new Date();
	const date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
	const time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
	const  date_time = date+' '+time;
    return date_time;
}
module.exports = {
    token_map:token_map,
    g_users:g_users,
    g_posts:g_posts,
    g_msgs:g_msgs,
    get_active_user:get_active_user,
    check_if_user_defined:check_if_user_defined,
    create_date_time:create_date_time

}