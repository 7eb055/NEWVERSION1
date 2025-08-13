import React from 'react';
import Header from '../component/header';
import Footer from '../component/footer';
import './css/AboutUsNew.css';

const AboutUs = () => {
  return (
    <div className="about-us-page">
      <Header />
      
      <main className="about-us-main">
        {/* Hero Section */}
        <section className="about-hero">
          <div className="hero-content">
            <h1 className="hero-title">About Eventify</h1>
            <p className="hero-subtitle">
              Connecting communities through exceptional event experiences
            </p>
          </div>
          <div className="hero-image">
            <img 
              src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
              alt="Event management"
            />
          </div>
        </section>

        {/* Mission Section */}
        <section className="mission-section">
          <div className="container">
            <h2 className="section-title">Our Mission</h2>
            <p className="mission-text">
              At Eventify, we believe that great events bring people together and create lasting memories. 
              Our mission is to provide a comprehensive platform that simplifies event management while 
              enhancing the attendee experience. Whether you're organizing a small workshop or a large 
              conference, we're here to make your event a success.
            </p>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section">
          <div className="container">
            <h2 className="section-title">What We Offer</h2>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <i className="fas fa-calendar-plus"></i>
                </div>
                <h3>Event Creation</h3>
                <p>Create and customize events with our intuitive event builder. Set up tickets, schedules, and more.</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">
                  <i className="fas fa-users"></i>
                </div>
                <h3>Attendee Management</h3>
                <p>Manage registrations, track attendance, and communicate with your attendees seamlessly.</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">
                  <i className="fas fa-chart-bar"></i>
                </div>
                <h3>Analytics & Insights</h3>
                <p>Get detailed insights into your event performance with comprehensive analytics and reporting.</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">
                  <i className="fas fa-mobile-alt"></i>
                </div>
                <h3>Mobile Friendly</h3>
                <p>Access your events and manage everything on the go with our responsive mobile design.</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">
                  <i className="fas fa-shield-alt"></i>
                </div>
                <h3>Secure & Reliable</h3>
                <p>Your data is protected with enterprise-grade security and our platform ensures 99.9% uptime.</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">
                  <i className="fas fa-headset"></i>
                </div>
                <h3>24/7 Support</h3>
                <p>Our dedicated support team is available around the clock to help you succeed.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="team-section">
          <div className="container">
            <h2 className="section-title">Our Team</h2>
            <p className="team-intro">
              Meet the passionate individuals behind Eventify who are dedicated to making your events extraordinary.
            </p>
            <div className="team-grid">
              <div className="team-member">
                <div className="member-image">
                  <img 
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" 
                    alt="Team member"
                  />
                </div>
                <h4>Alex Johnson</h4>
                <p className="member-role">CEO & Founder</p>
                <p className="member-bio">
                  Passionate about connecting communities through technology and exceptional event experiences.
                </p>
              </div>
              
              <div className="team-member">
                <div className="member-image">
                  <img 
                    src="https://images.unsplash.com/photo-1494790108755-2616b612b372?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" 
                    alt="Team member"
                  />
                </div>
                <h4>Sarah Chen</h4>
                <p className="member-role">CTO</p>
                <p className="member-bio">
                  Leading our technical vision with over 10 years of experience in scalable platform development.
                </p>
              </div>
              
              <div className="team-member">
                <div className="member-image">
                  <img 
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" 
                    alt="Team member"
                  />
                </div>
                <h4>Michael Rodriguez</h4>
                <p className="member-role">Head of Design</p>
                <p className="member-bio">
                  Crafting beautiful and intuitive user experiences that make event management effortless.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="values-section">
          <div className="container">
            <h2 className="section-title">Our Values</h2>
            <div className="values-grid">
              <div className="value-item">
                <h3>Innovation</h3>
                <p>We continuously evolve our platform with cutting-edge technology and creative solutions.</p>
              </div>
              <div className="value-item">
                <h3>Community</h3>
                <p>We believe in the power of bringing people together and fostering meaningful connections.</p>
              </div>
              <div className="value-item">
                <h3>Excellence</h3>
                <p>We strive for excellence in everything we do, from our product to our customer service.</p>
              </div>
              <div className="value-item">
                <h3>Accessibility</h3>
                <p>We make event management accessible to everyone, regardless of technical expertise.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact CTA Section */}
        <section className="contact-cta">
          <div className="container">
            <h2>Ready to Create Amazing Events?</h2>
            <p>Join thousands of event organizers who trust Eventify to bring their vision to life.</p>
            <div className="cta-buttons">
              <a href="/signup" className="cta-primary">Get Started Free</a>
              <a href="#contact" className="cta-secondary">Contact Us</a>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default AboutUs;
