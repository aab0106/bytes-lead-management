import React from 'react';
import { Container } from 'react-bootstrap';

const Footer = () => {
  const currentYear = new Date().getFullYear();
    return (
    <footer className="bg-light py-3">
      <Container className="text-center">
        <p className="mb-0">© {currentYear} BYTES. All Rights Reserved.</p>
      </Container>
    </footer>
  );
};

export default Footer;