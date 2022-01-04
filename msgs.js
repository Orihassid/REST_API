
const global = require('./global.js');
const fs = require("fs").promises;
const file = require('./rwfile.js');
const StatusCodes = require('http-status-codes').StatusCodes;


function create_new_msg_id()
{
	let max_id = 0;   
	global.g_msgs.forEach(
		item => { max_id = Math.max( max_id, item.msg_id) }
	)
	return max_id + 1;	
}



async function admin_send_msgs_to_all(req,res)
{
    const active_user = global.get_active_user(req);
    if(!active_user)
	{
		global.check_if_user_defined(active_user,res);
		return;
	}

    if(active_user.id != global.g_users[0].id)
    {
        res.status( StatusCodes.BAD_REQUEST );
		res.send( "Only admin can send messages to all users");
		return;
    }

    if ( !req.body.text)
	{
		res.status( StatusCodes.BAD_REQUEST );
		res.send( "Missing parameters in request")
		return;
	}

    const new_msg = {msg_id:create_new_msg_id(),
        sender:{id:active_user.id,
                first_name:active_user.first_name,
                last_name:active_user.last_name
            },
        reciver:'all',
        text: req.body.text,
        date_time:global.create_date_time()}
    global.g_msgs.push(new_msg);
    await file.save_to_file('msgs.json',global.g_msgs);
    res.send(  JSON.stringify(new_msg.text ) );
}

async function user_send_msg(req,res)
{
    const reciver_id = parseInt(req.params.id);
    const active_user = global.get_active_user(req)
    if(!active_user)
	{
		global.check_if_user_defined(active_user,res);
		return;
	}
    
    if ( !req.body.text || !reciver_id)
	{
		res.status( StatusCodes.BAD_REQUEST );
		res.send( "Missing parameters in request")
		return;
	}
    
    const reciver_user = global.g_users.find(item => item.id == reciver_id);
    const new_msg = {msg_id:create_new_msg_id(),
                    sender:{id:active_user.id,first_name:active_user.first_name,last_name:active_user.last_name},
                    reciver: {id:reciver_user.id,first_name:reciver_user.first_name,last_name:reciver_user.last_name},
                    text: req.body.text,
                    date_time:global.create_date_time()}
    global.g_msgs.push(new_msg);
    await file.save_to_file('msgs.json',global.g_msgs);
    res.send(  JSON.stringify(new_msg.text ) );
}

function get_msgs(req ,res)
{
    const active_user = global.get_active_user(req)
    if(!active_user)
	{
		global.check_if_user_defined(active_user,res);
		return;
	}
    const self_msgs = [];
    global.g_msgs.forEach(item => {
    if(item.reciver == 'all' || item.reciver.id == active_user.id)
        {
            if(!(active_user.id == global.g_users[0].id && item.reciver == 'all')){
                let msg_to_print = {msg_id : item.msg_id , 
                                    sender : item.sender ,
                                    text : item.text,
                                    date_time : item.date_time}
                self_msgs.push(msg_to_print);
            }
        }
        else{
            res.send('There are no message for you.');
         } 
      })
    res.send(  JSON.stringify(self_msgs ) );

}
module.exports = {
    admin_send_msgs_to_all : admin_send_msgs_to_all,
    user_send_msg :user_send_msg ,
    get_msgs: get_msgs
}