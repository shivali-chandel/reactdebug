
import {useCallback, useState, useReducer} from 'react';
import React from 'react';
const initialState = {height: 100, age:3}
function reducer(state, action) {
    switch (action.type) {
      case 'height':
        return {...state, height : state.height + 100};
      case 'age':
        return {...state, age : state.age + 3};
      default:
        throw new Error();
    }
  }
const TestCall = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [height, setHeight] = useState(100)
   const [age, setAge] = useState(3)

const handleSetHeight = () => {
    console.log('hiii')
    setHeight(height + 10)}
const handleSetAge = () => {
    console.log('hii2')
    setAge(age + 1)}
    return (<>
    <div>{state.height}</div>
    <div>{state.age}</div>
      <button onClick={() => dispatch({type: 'height'})}>
       Set Height </button>
        <button onClick={() => dispatch({type: 'age'})}>
        Set Age</button></>)

}

export default TestCall;