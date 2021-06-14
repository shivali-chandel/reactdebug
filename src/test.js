import React, {Component} from 'react';
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  FlatList,
  Animated,
  StyleSheet,
  Platform,
  Dimensions
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AntDesign from 'react-native-vector-icons/AntDesign';
import CustomHeaderweather from '../../component/CustomHeaderweather';
import SearchLocation from '../../component/SearchLocation';
import CustomPicker from '../../component/CustomPickerwithourborder';
import Colors from '@utility/colors';
import Service from '../../utilities/core.api';
const {officalGrey, officalBlue, commonBlue} = Colors;
import storageApi from '../../utilities/storage.api';
import messageAlert from '@component/customAlert';
import Images from '@asset/image';
import CustomTextInput from '@component/customTextInput';
import Geolocation from 'react-native-geolocation-service';
let width = Dimensions.get('window').width
let height = Dimensions.get('window').height
// import Styles from '@style/buyerorseller';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Axios from 'axios';
import moment from 'moment';
const {gear, drawer,Cloudicon,leftarrow,crossicon} = Images;
let horizontaldata =[
  {
  time:'20:00',
  forenheight:'60 F',
  img:Cloudicon,
}, {
  time:'20:00',
  forenheight:'62 F',
  img:Cloudicon
}, {
  time:'20:00',
  forenheight:'65 F',
  img:Cloudicon
}, {
  time:'20:00',
  forenheight:'60 F',
  img:Cloudicon
}, {
  time:'20:00',
  forenheight:'68 F',
  img:Cloudicon
}];


let weatherlist =[
  {
  time:'20:00',
  day:'Sat JAN 15',
  forenheight:'60 / 65 C',
  img:Cloudicon,
  name:'Chandigadh'
},  {
  time:'20:00',
  day:'Sat JAN 15',
  forenheight:'60 / 65 C',
  img:Cloudicon,
  name:'Chandigadh'
},  {
  time:'20:00',
  day:'Sat JAN 15',
  forenheight:'60 / 65 C',
  img:Cloudicon,
  name:'Chandigadh'
}, 
  {
    time:'20:00',
    day:'Sat JAN 15',
    forenheight:'60 / 65 C',
    img:Cloudicon,
    name:'Chandigadh'
  },  {
    time:'20:00',
    day:'Sat JAN 15',
    forenheight:'60 / 65 C',
    img:Cloudicon,
    name:'Chandigadh'
  },{
    time:'20:00',
    day:'Sat JAN 15',
    forenheight:'60 / 65 C',
    img:Cloudicon,
    name:'Chandigadh'
  },  {
    time:'20:00',
    day:'Sat JAN 15',
    forenheight:'60 / 65 C',
    img:Cloudicon,
    name:'Chandigadh'
  },];
export default class test extends Component {
  constructor(props) {
    super(props);
    this.state = {
      notchHeight: '',
      data: [],
      date: '',
      description: '',
      compatibility: '',
      typeOfProperty: '',
      mood: '',
      color: '',
      lucky_number: '',
      texttvalue:'',
      isshowsearchui:false,
      isshowCelsius:false,
      myLocationLat:'',
      myLocationLong:'',
      celsius: null,
      fahrenheit: null,  
      weatherDescription:{},
      humiditydata:'',
      windspeed:'',
      weakWeatherdata:[],
      HoursweatherData:[],
      weatherlistData:[],
    };
  }

  componentDidMount = async () => {
    let token = await new storageApi._retrieveData('token');
    const response = await new Service().getProfileInformation(token);
    console.log("Api responce " , response.data.data);
    this.getlistingdata();
  };

 
  
  checkFieldCompleted = () => {
    console.log(this.state);
    if (!this.state.typeOfProperty) {
    } else {
      // this.props.StoreData()
    }
  };

  hadnleserchtext=(text)=>{
  this.setState({texttvalue:text})
  }


  getlistingdata= async ( )=>{
    let token = await new storageApi._retrieveData('token');
  
    try {   
      const response = await new Service().getlocattionlist(token);
      // console.log("data is the listt Api", response.data.data);
      if (response.data) {
        if (response.data.status) {
           messageAlert('Weather Location saved successfully');
         this.setState({weatherlistData : response.data.data });
        //  console.log("data is the listt Api", JSON.stringify(this.state.weatherlistData));
        }
      }
    } catch (error) {
      console.log('err is', error);
      messageAlert('Something went wrong', 'danger');
      return;
    }
   
  // this.props.navigation.navigate('storeweatherdata')
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
    
  
    return (
    <>
     { data.map( (item,index)=>{
       
       
        this.setTheTempatureOfLocation(item.lat ,item.lon).then((item2,index2)=>{
          
          return(
            <TouchableOpacity style={styles.storedataParent}>
            <TouchableOpacity style={{alignItems:'center'}}>
            <Text style={{color:'white',fontWeight:'600',fontSize:14}}>{item2.name}</Text>
            <Text style={{color:'white',fontWeight:'bold',fontSize:14}}>{item.name}</Text>
            </TouchableOpacity>
            <View>
            <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',}}>
           <Image style={{height:30,width:30}} source={Cloudicon}/>
            <Text style={{textAlign:'center',left:10,paddingRight:15,color:'white',fontSize:14,fontWeight:'600'}}>{item.forenheight}</Text>
            <TouchableOpacity style={{width:50,alignItems:'center'}}>
            <Image  style={{height:20,width:20}} resizeMethod='auto' source={crossicon}/>
            </TouchableOpacity>
            </View>
            </View>
            </TouchableOpacity>
          )
        })
        .catch((err)=>{
          console.log("erroror" , err)
        })
       
        
       
      })}
      </> )
     
    
  }
  weathermainui=()=>{
   console.log("Weather Decription data 444444", this.state.weatherDescription)
    return(
      <>
      {!this.state.isshowCelsius ? (
      <View style={{flex:1}}>
         <View style={{height:180,width:'90%',alignSelf:'center',}}>
           <View style={styles.firstviewstyle}>
             <View>
             <Image style={{height:40,width:40 ,}} tintColor='red'  source={{uri :`http://openweathermap.org/img/wn/${this.state.weatherDescription.icon}.png`}}></Image>
             </View>
             <View>
            <Text style={styles.cloudsstyle}>{this.state.weatherDescription.main}</Text>
            <Text style={styles.cloudsstyle}>{this.state.weatherDescription.description}</Text>
             </View>
           </View>
           <View style={{height:80,width:'80%',alignSelf:'center',justifyContent:'center',flexDirection:'row'}}>
             <Text style={{textAlign:'center',justifyContent:'center',fontWeight:'bold',fontSize:80,color:'white'}}>{this.state.fahrenheit} </Text>
             <View style={{flexDirection:'row',left:5}}>
               <Text style={{top:16,fontWeight:'bold',color:'white',fontSize:20}}>O</Text>
             <Text style={{textAlign:'center',justifyContent:'center',fontWeight:'bold',fontSize:80,color:'white'}}>F</Text>
            </View>
           </View>
           <View style={{height:50,width:'90%',alignSelf:'center',justifyContent:'space-between',flexDirection:'row',alignItems:'center',marginTop:5}}>
             <Text style={styles.humidityStyle}>{`Wind: ${this.state.windspeed} m/s`}</Text>
             <Text style={styles.humidityStyle}>{`Humidity: ${this.state.humiditydata}%`}</Text>
           </View>
        </View>
        <View style={{flexDirection:'row',alignSelf:'center',width:'80%',justifyContent:'space-between',marginTop:8,marginBottom:10}}>
          {this.horizonatalcloudUi(this.state.HoursweatherData)}
        </View>
        <View style={{marginTop:10}}>
          {this.listviewUi(this.state.weakWeatherdata)}
          </View>
        </View>
        ):(
          <View style={{flex:1}}>
          <View style={{height:180,width:'90%',alignSelf:'center',}}>
            <View style={styles.firstviewstyle}>
              <View>
              <Image style={{height:40,width:40,}} source={{uri : `http://openweathermap.org/img/wn/${this.state.weatherDescription.icon}.png`}}></Image>
              </View>
              <View>
              <Text style={styles.cloudsstyle}>{this.state.weatherDescription.main}</Text>
            <Text style={styles.cloudsstyle}>{this.state.weatherDescription.description}</Text>
              </View>
            </View>
            <View style={{height:80,width:'80%',alignSelf:'center',justifyContent:'center',flexDirection:'row'}}>
              <Text style={{textAlign:'center',justifyContent:'center',fontWeight:'bold',fontSize:80,color:'white'}}>{this.state.celsius} </Text>
              <View style={{flexDirection:'row',left:5}}>
                <Text style={{top:16,fontWeight:'bold',color:'white',fontSize:20}}>O</Text>
              <Text style={{textAlign:'center',justifyContent:'center',fontWeight:'bold',fontSize:80,color:'white'}}>C</Text>
             </View>
            </View>
            <View style={{height:50,width:'90%',alignSelf:'center',justifyContent:'space-between',flexDirection:'row',alignItems:'center',marginTop:5}}>
              <Text style={styles.humidityStyle}>{`Wind: ${this.state.windspeed} m/s`}</Text>
              <Text style={styles.humidityStyle}>{`Humidity: ${this.state.humiditydata}%`}</Text>
            </View>
         </View>
         <View style={{flexDirection:'row',alignSelf:'center',width:'80%',justifyContent:'space-between',marginTop:8,marginBottom:10}}>
           {this.horizonatalcloudUi(this.state.HoursweatherData)}
         </View>
         <View style={{marginTop:10}}>
          {this.listviewUi(this.state.weakWeatherdata)}
          </View>
         </View>
        )}
        </>
    )
  }
  handleSearchui=()=>{
   this.setState({isshowsearchui:!this.state.isshowsearchui})
  }
  handlecelsius=()=>{
   
    this.setState({isshowCelsius:true})
  }
  handleforenheight=()=>{
    this.setState({isshowCelsius:false})
  }

  convertcelciusdata=(data)=>{
    let newdata = (5/9) * (data - 32)
    return newdata.toFixed(0);
  }
  gettimedateformat = (timestamp)=>{
    var timestemp = new Date( timestamp * 1000);
    var formatted = moment(timestemp).format("ddd DD MMM");

    return formatted
  }

  getforeinHeight=(data)=>{
    let newdata = `${Math.round(data)}`
    return newdata;
  }

  getTimefromtimestamp=(timestamp)=>{
    var timestemp = new Date( timestamp * 1000);
    var formatted = moment(timestemp).format("ddd DD MMM");
    var hours = timestemp.getHours();
    var minuttes = timestemp.getMinutes();
    var total = `${hours} ${minuttes}`
    return total
  }
  handlefocus=()=>{
    this.setState({isfocus:true})
  }
  handlleBlur=()=>{
    this.setState({isfocus:false})
  }

  render() {
    const{texttvalue, isshowsearchui} =this.state
    return (
      <LinearGradient
      colors={["#1D4ECB",'#2675EA']}
      style={styles.gradientstyle} >
      <SafeAreaView style={{flex: 1,}}>
        <View style={{flex : 1}}>
          <ScrollView contentContainerStyle={{paddingBottom:300}}>
        <View style={styles.parent}>
         <CustomHeaderweather
         props={this.props.navigation}
         OncelsiusPress={this.handlecelsius}
         OnforenHeightPress={this.handleforenheight}
         isshowCelsius={this.state.isshowCelsius}
         countryname={"Weather"}
         />
         <SearchLocation
         ontextChange={(text)=>this.hadnleserchtext(text)}
         textvalue={texttvalue}
         
         onSearchaction={()=>this.handleSearchui()}
         props={this.props.navigation}/>
         <View style={{top:15}}>
         {this.storelocationdata(this.state.weatherlistData)}
          </View>
        </View>
        {/* </View> */}
        </ScrollView>
        </View>
      </SafeAreaView>
      </LinearGradient>
    );
  }
}

const styles = StyleSheet.create({
  parent:{
   flex:1,
  
  },
  gradientstyle:{
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
   top:0
  },
  firstviewstyle:{
    height:50,
    top:5,
    bottom:5,
    paddingLeft:10,
    paddingRight:5, 
     width:'40%',
     alignSelf:'center',
     alignItems:'center',
     flexDirection:'row',
     justifyContent:'space-around'
  },
  cloudsstyle:{
    fontWeight:'700',
    fontSize:15,
    color:'white',
    right:5
  },
  humidityStyle:{
    color:'white',
    fontSize:15,
    fontWeight:'600'
  },
  storedataParent:{
    backgroundColor:null,
    height:'10%',
    width:'90%',
    alignSelf:'center',
    flexDirection:'row',
    justifyContent:'space-between',
    alignItems:'center',
    paddingLeft:15,
    paddingRight:3,
    backgroundColor:'#0098f5',
    marginTop:5,
    marginBottom:5
  },
  scrollView: {
   
  },
});