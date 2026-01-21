import React from 'react';
import '../styles/About.css';

export default function About() {
  return (
    <div className="about-container">
      <div className="about-wrapper">
        <div className="about-hero">
          <h1>About InnerVoice</h1>
          <p className="hero-subtitle">
            A platform for authentic, anonymous voices and meaningful connections
          </p>
        </div>

        <section className="about-section">
          <h2>Our Mission</h2>
          <p>
            InnerVoice is dedicated to creating a safe, judgment-free space where people can share their thoughts,
            confessions, and experiences anonymously. We believe that everyone deserves to be heard, and anonymity
            enables people to express themselves authentically without fear of judgment or social consequences.
          </p>
        </section>

        <section className="about-section">
          <h2>What We Do</h2>
          <p>
            Our platform allows users to post confessions and engage in meaningful conversations through comments and
            replies. Whether it's a personal struggle, a funny story, or something you've always wanted to say but couldn't—
            InnerVoice is the place to share it all, completely anonymously.
          </p>
        </section>

        <section className="about-section">
          <h2>Our Values</h2>
          <div className="values-grid">
            <div className="value-card">
              <h3>Anonymity</h3>
              <p>Complete privacy and anonymity for all users. Your identity is always protected.</p>
            </div>
            <div className="value-card">
              <h3>Safety</h3>
              <p>We maintain a safe community with content moderation and strict community guidelines.</p>
            </div>
            <div className="value-card">
              <h3>Authenticity</h3>
              <p>Genuine, unfiltered expressions that allow people to be their true selves.</p>
            </div>
            <div className="value-card">
              <h3>Community</h3>
              <p>Building meaningful connections through shared experiences and mutual support.</p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>Community Guidelines</h2>
          <ul className="guidelines-list">
            <li>Be respectful to other users, even when disagreeing</li>
            <li>No harassment, bullying, or hate speech</li>
            <li>No sharing of personal information or doxxing</li>
            <li>No explicit or adult content</li>
            <li>No spam or promotional content</li>
            <li>Keep confessions relevant and appropriate</li>
            <li>Report inappropriate content to moderators</li>
          </ul>
        </section>

        <section className="about-section">
          <h2>Privacy & Security</h2>
          <p>
            Your privacy is our top priority. All confessions and comments are posted anonymously, and we never
            collect or store personal identifying information unless you explicitly provide it through contact forms.
            We use industry-standard encryption and security measures to protect your data.
          </p>
        </section>

        <section className="about-section">
          <h2>Get Involved</h2>
          <p>
            Want to help build InnerVoice? We're always looking for passionate people to join our team. Whether you're
            interested in development, moderation, or community building, <a href="/contacts">reach out to us</a> to
            learn more about opportunities.
          </p>
        </section>

        <section className="about-section">
          <h2>Contact & Support</h2>
          <p>
            Have questions or feedback? <a href="/contacts">Contact us anytime</a>. We're here to help make InnerVoice
            the best platform it can be.
          </p>
        </section>
      </div>
    </div>
  );
}
