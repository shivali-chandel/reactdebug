import React, {useState} from 'react';

const Test2 = () => {
    console.log('main2')
    const [name2, setName2] = useState('Shekhar2')
    const submitName2 = () => {
        setName2('Sanket2')
    }
    
    return(
    <div>
        <div>{name2}</div>
        <button onClick={submitName2}>Change Name2</button>
    </div>
)}

export default Test2;

