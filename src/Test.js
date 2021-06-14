import React, {useState, Component} from 'react';
import Axios from 'axios';

class Test extends Component  {
    constructor(props) {
        super(props);
        this.state = {
          weatherlistData:[
            {
            time:'20:00',
            day:'Sat JAN 15',
            forenheight:'60 / 65 C',
            name:'Chandigadh',
            lat : 30.7046, 
            lon : 76.7179
          },  {
            time:'20:00',
            day:'Sat JAN 15',
            forenheight:'60 / 65 C',
            name:'Chandigadh',
            lat : 30.7046, 
            lon : 76.7179
          },  
             ],
        };
      }
    setTheTempatureOfLocation = async (latitude, longitude) => {
        console.log("Weather lat long is the", latitude , longitude);
        try {
          const response = await Axios.get(
            `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=dceb837729f93d842adb4a1e3c6cdaf0&units=imperial`
          );
         
          console.log("loop item responce", response);
          return response.data;
            
        } catch (error) {
          console.log('error', error);
        }
      };
    storelocationdata=(data)=>{
             let func = data.map((item,index)=>{
            return this.setTheTempatureOfLocation(item.lat ,item.lon).then((item2,index2)=>{
                console.log('item2', item2)
              
            })
            .catch((err)=>{
              console.log("erroror" , err)
            })
          })
        
         console.log('func', func)
         return (<div>{func.name}hiii</div>)
        
      }
       render(){
       return (<div> {this.storelocationdata(this.state.weatherlistData)}hiiiii</div>)
       }
};

export default Test;

