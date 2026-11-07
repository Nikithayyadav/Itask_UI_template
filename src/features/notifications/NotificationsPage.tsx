import type { Notification } from '../../app/types';

export function NotificationsPage({notifications,setNotifications}:{notifications:Notification[];setNotifications:(items:Notification[])=>void}) {
  return <section className="panel module-panel"><div className="panel-heading"><div><h2>Notifications</h2><p>Stay up to date with your workspace.</p></div><button className="text-action" onClick={()=>setNotifications(notifications.map(item=>({...item,read:true})))}>Mark all as read</button></div>{notifications.map((item,index)=><div className={`notification-row ${item.read?'read':''}`} key={index}><span className="notification-icon">♧</span><div><b>{item.text}</b><small>{item.time}</small></div>{!item.read&&<i/>}</div>)}</section>;
}
