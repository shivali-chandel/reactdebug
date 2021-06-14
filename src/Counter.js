import React, { useState, useCallback } from 'react'

const functionsCounter = new Set()

const Counter = () => {
    console.log('hiiii')
  const [count, setCount] = useState(0)
  const [otherCounter, setOtherCounter] = useState(0)

  const increment = () => {
    setCount(count + 1)
  }
  const decrement = () => {
    setCount(count - 1)
  }
  const incrementOtherCounter = () => {
    setOtherCounter(otherCounter + 1)
  }

  functionsCounter.add(increment)
  functionsCounter.add(decrement)
  functionsCounter.add(incrementOtherCounter)

//   alert(functionsCounter)

  return (
    <>
      Count: {count}
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
      <button onClick={incrementOtherCounter}>incrementOtherCounter</button>
    </>
  )
}

export default Counter;
