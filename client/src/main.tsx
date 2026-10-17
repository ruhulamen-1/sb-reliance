import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import Portfolio from './pages/Portfolio';
import Team from './pages/Team';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import NotFound from './pages/NotFound';
import ServicePage from './pages/ServicePage';
import PostPage from './pages/PostPage';
import Blog from './pages/Blog';
import ProjectPage from './pages/ProjectPage';
import './styles.css';

// admin (with payroll and attendance) and the review form are rarely opened: load them only when visited,
// so visitors' phones do not download and run that code
const Admin = lazy(() => import('./pages/Admin'));
const Review = lazy(() => import('./pages/Review'));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          {["/", "/services", "/why-us"].map((path) => (
            <Route key={path} path={path} element={<Home />} />
          ))}
          <Route path="/services/:slug" element={<ServicePage />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<PostPage />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/portfolio/:slug" element={<ProjectPage />} />
          <Route path="/team" element={<Team />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy-policy" element={<Privacy />} />
          <Route path="/about" element={<About />} />
          <Route path="/review" element={<Review />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>,
);
