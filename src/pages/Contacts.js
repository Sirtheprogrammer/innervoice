import React, { useState } from 'react';
import '../styles/Contacts.css';
import Header from '../components/Header';

export default function Contacts() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }

    if (!formData.subject.trim()) {
      setError('Subject is required');
      return;
    }

    if (!formData.message.trim()) {
      setError('Message is required');
      return;
    }

    // In a real app, you'd send this to a backend service
    console.log('Contact form submitted:', formData);
    setSubmitted(true);
    setFormData({ name: '', email: '', subject: '', message: '' });
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <>
      <Header />
      <div className="contacts-container">
        <div className="contacts-wrapper">
          <h1>Contact Us</h1>
          <p className="contacts-intro">
            Have questions or feedback? We'd love to hear from you. Get in touch with us using the form below.
          </p>

          <div className="contacts-content">
            <div className="contact-info">
              <h2>Get In Touch</h2>
              <div className="info-item">
                <h3>Email</h3>
                <p>support@innervoice.com</p>
              </div>
              <div className="info-item">
                <h3>Phone</h3>
                <p>+255762676147</p>
              </div>
              <div className="info-item">
                <h3>Address</h3>
                <p>Daresalaam<br />Tanzania</p>
              </div>
              <div className="info-item">
                <h3>Hours</h3>
                <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
              </div>
            </div>

            <form className="contact-form" onSubmit={handleSubmit}>
              <h2>Send us a Message</h2>
              {error && <div className="form-error">{error}</div>}
              {submitted && <div className="form-success">Thank you! Your message has been sent.</div>}

              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="subject">Subject </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="What is this about?"
                />
              </div>

              <div className="form-group">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Your message here..."
                  rows="5"
                />
              </div>

              <button type="submit" className="submit-btn">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
