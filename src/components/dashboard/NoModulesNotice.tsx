'use client';

import { Card, Result, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function NoModulesNotice({ userName }: { userName: string }) {
  return (
    <Card
      style={{ borderRadius: 12, textAlign: 'center', border: '1px solid hsl(var(--border-default))' }}
      styles={{ body: { padding: '48px 32px' } }}
    >
      <Result
        icon={<LockOutlined style={{ color: 'hsl(var(--text-disabled))', fontSize: 56 }} />}
        title={
          <span style={{ color: 'hsl(var(--text-primary))', fontSize: 18 }}>
            Hola, {userName.split(' ')[0]}
          </span>
        }
        subTitle={
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 14, display: 'block', marginBottom: 8 }}>
              Todavía no tienes módulos asignados.
            </Text>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Consulta a tu administrador para que configure tu acceso al sistema.
            </Text>
          </div>
        }
      />
    </Card>
  );
}
