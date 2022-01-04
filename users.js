// External modules
const express = require('express')
const StatusCodes = require('http-status-codes').StatusCodes;
const package = require('./package.json');
const fs = require("fs").promises;
const file = require('./rwfile.js');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const global = require('./global.js');
const posts = require('./posts.js');
const msgs = require('./msgs.js');

const app = express()
let  port = 2718;


// General app settings
const set_content_type = function (req, res, next) 
{
	res.setHeader("Content-Type", "application/json; charset=utf-8");
	next()
}

app.use( set_content_type );
app.use(express.json());  // to support JSON-encoded bodies
app.use(express.urlencoded( // to support URL-encoded bodies
{  
  extended: true
}));

function create_random_token()
{  
	return new Promise((resolve,reject) => {
        crypto.randomBytes(48,function(err,buffer){
              if(err){reject('failed');}
			  resolve(buffer.toString('hex'));
			  
		});
	})
	   
}

async function create_new_token()
{
	let token =  await create_random_token();
	while(global.token_map.get(token) != undefined)
	{
		token = await create_random_token();
	}
	return token;
}

// User's table
const today = new Date().toLocaleDateString();

const admin_user = {id:1, first_name: 'Admin',last_name: "Admin",email:"Admin1@gmail.com",password:"admin1",date: `${today}`,status: "active"};
 global.g_users = [ admin_user ];

// API functions

// Version 
function get_version( req, res) 
{
	const version_obj = { version: package.version, description: package.description };
	res.send(  JSON.stringify( version_obj) );   
}

function list_users( req, res) 
{
	let active_user = global.get_active_user(req);//active and have token
	if(!active_user)
	{
		global.check_if_user_defined(active_user,res);
		return;
	}
	if(active_user.id != global.g_users[0].id)
	{
		res.status(StatusCodes.BAD_REQUEST)
		res.send("Only Admin can list users")
	}

	res.send(  JSON.stringify( global.g_users) )	   
}

function get_user( req, res )
{
	let active_user = global.get_active_user(req);//active and have token
	if(!active_user)
	{
		global.check_if_user_defined(active_user,res);
		return;
	}
	
	const id =  parseInt( req.params.id );

	if ( id <= 0)
	{
		res.status( StatusCodes.BAD_REQUEST );
		res.send( "Bad id given")
		return;
	}

	const user =  global.g_users.find(user =>  user.id == id )
	if ( !user)
	{
		res.status( StatusCodes.NOT_FOUND );
		res.send( "No such user")
		return;
	}
	if(active_user.id == id)//if user get is own details
	{
		res.send(  JSON.stringify( user) )
	}
	
	else if(active_user.id ==admin_user.id)//if the admin did the req
	{
		let details = {id: user.id ,first_name:user.first_name, last_name:user.last_name,email: user.email,status:user.status}
		res.send(  JSON.stringify(details ));
	}
	else// user ask for other user that is not the admin
	{
		let details = {id: user.id,first_name:user.first_name, last_name:user.last_name}
		res.send(  JSON.stringify(details ));
	}
   
}

  async function create_user( req, res )
{
	const first_name = req.body.first_name;
    const last_name = req.body.last_name;
    const email = req.body.email;
    const password = req.body.password;
    const today = new Date().toLocaleDateString();

	if ( !first_name || !last_name || !email || !password)
	{
		res.status( StatusCodes.BAD_REQUEST );
		res.send( "Missing parameters in request")
		return;
	}

	let regex = new RegExp('[a-z0-9]+@[a-z]+\.[a-z]{2,3}')
	const is_email_exist = global.g_users.findIndex(user => user.email.toLowerCase() == email.toLowerCase());

    if(!regex.test(email))
    {
        res.status( StatusCodes.BAD_REQUEST );
		res.send( "Invalid email in request")
		return;
    }

	if(is_email_exist!=-1)
    {
        res.status( StatusCodes.BAD_REQUEST );
		res.send( "Email already exist in request")
		return;
    }

	// Find max id 
	let max_id = 0;
    
	global.g_users.forEach(
		item => { max_id = Math.max( max_id, item.id) }
	)
	const new_id = max_id + 1;
    
	const new_user = { id : new_id , first_name : first_name, last_name : last_name, email: email , password:await hash(password) , date : today , status: 'created'};
    global.g_users.push(new_user)
   await file.save_to_file("users.json",global.g_users);

	res.status( StatusCodes.CREATED );
	res.send(  JSON.stringify( new_user) );   
}
async function hash(password)
{
    const salt = await bcrypt.genSalt();
	const hash_password = await bcrypt.hash(password,salt);
	return hash_password;
}

function update_user( req, res )
{
	const id =  parseInt( req.params.id );

	if ( id <= 0)
	{
		res.status( StatusCodes.BAD_REQUEST );
		res.send( "Bad id given")
		return;
	}

	const idx =  global.g_users.findIndex( user =>  user.id == id )
	if ( idx < 0 )
	{
		console.log(user)
		console.log("update user")
		res.status( StatusCodes.NOT_FOUND );
		res.send( "No such user")
		return;
	}

	const name = req.body.name;

	if ( !name)
	{
		res.status( StatusCodes.BAD_REQUEST );
		res.send( "Missing name in request")
		return;
	}

	const user = global.g_users[idx];
	user.name = name;

	res.send( JSON.stringify( {user}) );   
}
async function login(req, res)
{
	const email = req.body.email;
	const password = req.body.password;
	if(!email || !password)
	{
		res.status( StatusCodes.BAD_REQUEST );
		res.send( "Missing email or password in request")
		return;
	}

	const user = global.g_users.find(u => u.email.toLowerCase() == email.toLowerCase());
	if(!user)
	{
		res.status( StatusCodes.BAD_REQUEST );
		res.send( "no user with this email");
		return;
	}

	if(user.status != 'active')
	{
		res.status(StatusCodes.BAD_REQUEST);
		res.send('This user is not active yet');
		return;
	}

	if(! (await bcrypt.compare(password, user.password)))
	{
		res.status( StatusCodes.BAD_REQUEST );
		res.send( "wrong password!!!");
		return;
	}
   try
   {
	const new_token = await create_new_token();
	global.token_map.set(new_token, user);
	res.json({token: new_token});
   }
   catch(err){
	   console.log(err)	
   }
}

function log_out(req,res){

	const token = req.headers.authorization;
	if(global.token_map.delete(token)){
		res.send("loggoed out succesfully");
	}
	else{
		res.send("already logged out")
	}
}

async function update_status(req, res)
{
	let user = global.get_active_user(req);
	if(!user)
	{
		global.check_if_user_defined(user,res);
		return;
	}
	
	

	const email = req.body.email;
	const status = req.body.status;
	if(!email || !status)
	{
		res.status( StatusCodes.BAD_REQUEST );
		res.send( "Missing email or status in request")
		return;
	}
	if(status == 'created')
	{
		res.status( StatusCodes.BAD_REQUEST );
		res.send( "User already created");
		return;
	}
	if(user.id === global.g_users[0].id)//if  admin did the request
	{
		const user_to_change =  global.g_users.find(  user=>  user.email.toLowerCase() === email.toLowerCase() )
		const index = global.g_users.findIndex(item => item.id == user_to_change.id);
		if(!user_to_change)
		{
			res.status( StatusCodes.NOT_FOUND );
			res.send( "user not exist");
			return;
		}

		if(user_to_change.id== admin_user.id)
		{
			res.status( StatusCodes.NOT_FOUND );
			res.send( "admin can not change admin");
			return;
		}
		
		if(user_to_change == status){
			res.status( StatusCodes.BAD_REQUEST );
			res.send( `status user is already ${status}`);
			return;

		}
		user_to_change.status = status;
		await file.save_to_file('users.json',global.g_users)
		if(status === 'suspend')
		{
			delete_user_tokens(index);
		}
		res.send(  JSON.stringify(user_to_change));	
	}
	else
	{
		res.status( StatusCodes.BAD_REQUEST );
		res.send( "Only admin can update status")
		return;
	}
}
async function delete_user( req, res )
{
	const id =  parseInt( req.params.id );
    const active_user = global.get_active_user(req);

	if(!active_user)
	{
		global.check_if_user_defined(active_user,res);
		return;
	}
    if ( id <= 0)
	{
		res.status( StatusCodes.BAD_REQUEST );
		res.send( "Bad id given")
		return;
	}

    if( active_user.id != admin_user.id)//regular user
    {
        if(active_user.id != id)
        {
            res.status(StatusCodes.BAD_REQUEST);
            res.send('User is not allowed to update other users.');
            return;
        }
    }

	if ( id == 1)
	{
		res.status( StatusCodes.FORBIDDEN ); // Forbidden
		res.send( "Can't delete root user")
		return;		
	}

	let idx =  global.g_users.findIndex( user =>  user.id == id )

	if ( idx < 0 )
	{
		res.status( StatusCodes.NOT_FOUND );
		res.send( "No such user")
		return;
	}
	delete_user_tokens(idx);
	try{
		global.g_users = JSON.parse (await fs.readFile('users.json','utf8'));
		global.g_users[idx].status = 'deleted';
		await file.save_to_file('users.json',global.g_users);

		global.g_users.forEach(user => {
			idx = global.g_users.indexOf(user);
			if(user.status == 'deleted')
			global.g_users.splice(idx , 1);
		});
	}
	catch(err){
		console.log(err);
	}
	res.send(  JSON.stringify( {}) );   
}

function delete_user_tokens(index)
{
	for (let [key, value] of  global.token_map) {
		if(value.id == global.g_users[index].id)
	 	{
			global.token_map.delete(key);
		}			
	 }
}


// Routing
const router = express.Router();
//User:
router.get('/version', (req, res) => { get_version(req, res )  } )
router.get('/users', (req, res) => { list_users(req, res )  } )
router.post('/users', (req, res) => { create_user(req, res )  } )
//router.put('/user/(:id)', (req, res) => { update_user(req, res )  } )// לבדוק אם להשאיר
router.get('/user/(:id)', (req, res) => { get_user(req, res )  })
router.delete('/user/(:id)', (req, res) => { delete_user(req, res )  })
router.post('/user/login', (req,res)=> {login(req, res)})
router.post('/user/logout', (req,res)=> {log_out(req, res)})
router.put('/updatestatus', (req,res)=> {update_status(req, res)})

//Posts:
router.post('/user/post', (req,res)=> {posts.create_post(req, res)})
router.get('/posts', (req,res)=> {posts.list_posts(req, res)})
router.delete('/post/(:id)', (req, res) => {posts.delete_post(req, res )  })

//Messages

router.post('/msg/:id(\\d+)/', (req,res)=> {msgs.user_send_msg(req, res)})
router.get('/msg', (req,res)=> {msgs.get_msgs(req, res)})
router.post('/msg/admin', (req, res) => {msgs.admin_send_msgs_to_all (req, res )  })


app.use('/api',router)


// Init 

let msg = `${package.description} listening at port ${port}`

async function start_server()
{
    try
	{   let idx ;   
		global.g_users = JSON.parse (await fs.readFile('users.json','utf8'));
		global.g_users.forEach(user => {
			idx = global.g_users.indexOf(user);
			if(user.status == 'deleted'){
				global.g_users.splice(idx , 1);

			}
		});
		
	}
	catch(err)
	{
	  admin_user.password = await hash(admin_user.password);
      global.g_users = [admin_user];
	  await file.save_to_file('users.json',global.g_users);
	  
	}

	try
	{
		let idx2;
		global.g_posts = JSON.parse (await fs.readFile('posts.json','utf8'));
		global.g_posts.forEach(post => {
			 idx2 = global.g_posts.indexOf(post);
			if(post.status == 'deleted'){
				global.g_posts.splice(idx2 , 1);
			}
		});
	}catch(err){
	
	}

	try{
		global.g_msgs = JSON.parse (await fs.readFile('msgs.json','utf8'));
	}catch(err){}
	
	app.listen(port, () => { console.log( msg ) ; })
}


start_server();



