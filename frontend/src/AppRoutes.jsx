import { BrowserRouter, Routes, Route } from 'react-router-dom'
import React from 'react'
import Home from './pages/Home'
import Register from './pages/Register'
import Login from './pages/Login'

const AppRoutes = () => {
    return (

        <BrowserRouter>
            <Routes>
                <Route path='/Login' element={<Login />} />
                <Route path='/Home' element={<Home />} />
                <Route path='/' element={<Register />} />
            </Routes>
        </BrowserRouter>
    )
}

export default AppRoutes