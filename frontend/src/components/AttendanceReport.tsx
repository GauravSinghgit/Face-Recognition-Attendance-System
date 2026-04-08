import React from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Box,
  LinearProgress,
} from '@mui/material';
import { format } from 'date-fns';

interface Student {
  id: number;
  user_id: number;
  session_id: string;
  status: 'present' | 'absent' | 'late';
  confidence_score: number;
  created_at: string;
  student_name: string;
  student_email: string;
  student_identifier: string | null;
}

interface AttendanceReportProps {
  session_id: string;
  total_students: number;
  present_count: number;
  absent_count: number;
  attendance_list: Student[];
  timestamp: string;
}

const AttendanceReport: React.FC<AttendanceReportProps> = ({
  session_id,
  total_students,
  present_count,
  absent_count,
  attendance_list,
  timestamp,
}) => {
  const attendanceRate = total_students > 0 ? (present_count / total_students) * 100 : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'success';
      case 'absent':
        return 'error';
      case 'late':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
      <Typography variant="h5" gutterBottom>
        Attendance Report
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Session: {session_id}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Time: {format(new Date(timestamp), 'PPpp')}
        </Typography>
        
        <Box sx={{ mt: 2, mb: 1 }}>
          <Typography variant="body2" gutterBottom>
            Attendance Rate: {attendanceRate.toFixed(1)}%
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={attendanceRate} 
            sx={{ height: 10, borderRadius: 5 }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Chip 
            label={`Present: ${present_count}`} 
            color="success" 
            variant="outlined" 
          />
          <Chip 
            label={`Absent: ${absent_count}`} 
            color="error" 
            variant="outlined" 
          />
          <Chip 
            label={`Total: ${total_students}`} 
            color="primary" 
            variant="outlined" 
          />
        </Box>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Roll Number</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Confidence</TableCell>
              <TableCell>Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {attendance_list.map((student) => (
              <TableRow key={student.id}>
                <TableCell>
                  <Typography variant="body2">{student.student_name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {student.student_email}
                  </Typography>
                </TableCell>
                <TableCell>{student.student_identifier || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                    color={getStatusColor(student.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {student.status === 'present' 
                    ? `${(student.confidence_score * 100).toFixed(1)}%`
                    : '-'
                  }
                </TableCell>
                <TableCell>
                  {format(new Date(student.created_at), 'pp')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default AttendanceReport;  