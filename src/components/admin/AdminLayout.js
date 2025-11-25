import React from 'react';
import AdminSidebar from './AdminSidebar';
import styles from './AdminLayout.module.css';

const AdminLayout = ({ children }) => {
  return (
    <div className={styles.adminLayout}>
      <AdminSidebar />
      <main className={styles.adminMain}>
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;