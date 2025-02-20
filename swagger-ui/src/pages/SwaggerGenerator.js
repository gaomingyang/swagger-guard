import React, { useState } from 'react';
import { Button, Input, Space, Typography, Row, Col, Card } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Title } = Typography;

const SwaggerGenerator = () => {
  const [parameters, setParameters] = useState(['']);
  const [responseJson, setResponseJson] = useState('');
  const [generatedSwagger, setGeneratedSwagger] = useState('');

  const handleAddParameter = () => {
    setParameters([...parameters, '']);
  };

  const handleRemoveParameter = (index) => {
    const newParameters = parameters.filter((_, i) => i !== index);
    setParameters(newParameters);
  };

  const handleParameterChange = (index, value) => {
    const newParameters = [...parameters];
    newParameters[index] = value;
    setParameters(newParameters);
  };

  const generateSwagger = () => {
    // 解析参数
    const parsedParams = parameters
      .filter(param => param.trim())
      .map(param => {
        const [key, value] = param.split(':').map(item => item.trim());
        return {
          name: key,
          in: 'query',
          required: true,
          type: 'string',
          description: value
        };
      });

    // 解析响应JSON
    let responseSchema = {};
    try {
      const responseObj = JSON.parse(responseJson);
      responseSchema = generateSchemaFromJson(responseObj);
    } catch (error) {
      alert('响应JSON格式无效');
      return;
    }

    // 生成Swagger配置
    const swaggerConfig = {
      swagger: '2.0',
      info: {
        title: 'Generated API',
        version: '1.0.0'
      },
      paths: {
        '/api/example': {
          get: {
            parameters: parsedParams,
            responses: {
              '200': {
                description: 'Successful response',
                schema: responseSchema
              }
            }
          }
        }
      }
    };

    setGeneratedSwagger(JSON.stringify(swaggerConfig, null, 2));
  };

  const generateSchemaFromJson = (json) => {
    const schema = {
      type: typeof json
    };

    if (Array.isArray(json)) {
      schema.type = 'array';
      schema.items = json.length > 0 ? generateSchemaFromJson(json[0]) : {};
    } else if (typeof json === 'object' && json !== null) {
      schema.type = 'object';
      schema.properties = {};
      for (const key in json) {
        schema.properties[key] = generateSchemaFromJson(json[key]);
      }
    }

    return schema;
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Swagger 配置生成器</Title>
      
      <Row gutter={24}>
        <Col span={12}>
          <Card title="请求参数配置">
            {parameters.map((param, index) => (
              <Space key={index} style={{ display: 'flex', marginBottom: 8 }}>
                <Input
                  placeholder="key:value"
                  value={param}
                  onChange={(e) => handleParameterChange(index, e.target.value)}
                  style={{ width: '300px' }}
                />
                {parameters.length > 1 && (
                  <MinusCircleOutlined onClick={() => handleRemoveParameter(index)} />
                )}
              </Space>
            ))}
            <Button
              type="dashed"
              onClick={handleAddParameter}
              icon={<PlusOutlined />}
              style={{ width: '300px', marginTop: 8 }}
            >
              添加参数
            </Button>
          </Card>

          <Card title="响应JSON配置" style={{ marginTop: 16 }}>
            <TextArea
              rows={6}
              value={responseJson}
              onChange={(e) => setResponseJson(e.target.value)}
              placeholder="请输入响应JSON示例"
            />
          </Card>

          <Button
            type="primary"
            onClick={generateSwagger}
            style={{ marginTop: 16 }}
          >
            生成Swagger配置
          </Button>
        </Col>

        <Col span={12}>
          <Card title="生成的Swagger配置">
            <TextArea
              rows={20}
              value={generatedSwagger}
              readOnly
              style={{ fontFamily: 'monospace' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SwaggerGenerator; 