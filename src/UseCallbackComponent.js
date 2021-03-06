
import React, { useState, useCallback } from 'react';

const UseCallbackComponent = () => {
  const [text, setText] = useState('Hello!');
  const [name, setName] = useState('Sanket');

  const ChildComponent = ({ text }) => {
    console.log('rendered again!');
    return (
      <div>
        { text }
     </div>
     );
  }

   // SOLO se renderiza de nuevo cuando el valor indicado (text) cambie
   const MemoizedComponent =useCallback(<ChildComponent text={ text } />, [text])

   return (
     <div>
       <button onClick={() => setText('Hello!')}>Hello! </button>
       <button onClick={() => setText('Hola!')}>Hola!</button>
       <button onClick={() => setName('Shekhar')}>Name</button>
       {name}
       { MemoizedComponent }
     </div>
   )
}

export default UseCallbackComponent;