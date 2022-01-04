const file = require('./rwfile.js');
const fs = require('fs').promises;
const global = require('./global.js');
const StatusCodes = require('http-status-codes').StatusCodes;




function create_new_post_id()
{
	let max_id = 0;   
	global.g_posts.forEach(
		item => { max_id = Math.max( max_id, item.id) }
	)
	return max_id + 1;	
}

async function create_post(req,res){

	const active_user = global.get_active_user(req);
	if(!active_user)
	{
		global.check_if_user_defined(active_user,res);
		return;
	}
	const id_post =  create_new_post_id();

	const  date_time = global.create_date_time();
	global.g_posts.push({user_id:active_user.id,first_name:active_user.first_name,last_name:active_user.last_name,email:active_user.email ,id:id_post ,date_time: date_time,text: req.body.text,status:"posted"} )

	await file.save_to_file('posts.json', global.g_posts);
	res.status( StatusCodes.CREATED );
	 res.send(  JSON.stringify( `id: ${id_post}`) );	


}

function list_posts(req,res)
{
	if(global.g_posts.length == 0)
	{
		res.status( StatusCodes.NOT_FOUND )
		res.send(JSON.stringify("there is no posts to show"))
	}
	let print_arr=[]
	let user = global.get_active_user(req);
	if(!user)
	{
		global.check_if_user_defined(user,res);
		return;
	}
	global.g_posts.forEach(item =>
		print_arr.push({user_id: item.user_id,first_name:item.first_name, last_name:item.last_name, email: item.email,post_id: item.id,creation_date:item.date_time,text:item.text}));
	res.status( StatusCodes.OK );
	res.send(JSON.stringify(print_arr))
}

async function delete_post(req,res)
{
	const post_id = parseInt(req.params.id);
	const active_user = global.get_active_user(req);
	if(!active_user)
	{
		global.check_if_user_defined(active_user,res);
		return;
	}
	const post_to_delete = global.g_posts.find(post => post.id == post_id);
	if(!post_to_delete)
	{
		res.status(StatusCodes.NOT_FOUND);
		res.send("post not found");
	}
	const idx = global.g_posts.findIndex(post => post.id == post_id);
	

	if((post_to_delete.id == active_user.id )|| (active_user.id == global.g_users[0].id))
	{
		try{
			global.g_posts = JSON.parse (await fs.readFile('posts.json','utf8'));
			global.g_posts[idx].status = 'deleted';
			await file.save_to_file('posts.json', global.g_posts);
			global.g_posts.forEach(post => {
				let index = global.g_posts.indexOf(post);
				if(post.status == 'deleted')
					global.g_posts.splice(index , 1);
			});
		}
		catch(err){
		}
	}
	else{
		res.status(StatusCodes.BAD_REQUEST);
		res.send("User can not delete other user's posts");
	}
	res.status(StatusCodes.OK);
	res.send(  JSON.stringify( {}) );  
}


module.exports = {
    create_post : create_post,
    list_posts : list_posts,
    delete_post: delete_post,
}
