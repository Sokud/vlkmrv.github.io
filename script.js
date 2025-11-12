document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const login = document.getElementById('login').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('message');
    const submitBtn = this.querySelector('button[type="submit"]');
    
    messageDiv.innerHTML = '';
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Processing...';
    
    try {
        const result = await loginUser(login, password);
        
        if (result.success) {
            messageDiv.innerHTML = `
                <div class="alert alert-success alert-dismissible fade show">
                    <h5>✅ Login Successful!</h5>
                    <hr>
                    <div class="entity-details">
                        <strong>Entity Details:</strong>
                        <div class="mt-2 p-3 bg-light rounded">
                            <pre class="mb-0">${formatEntityDetails(result.data)}</pre>
                        </div>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="alert alert-danger alert-dismissible fade show">
                    <h5>❌ Login Failed</h5>
                    <p class="mb-0">${result.error}</p>
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
        }
    } catch (error) {
        messageDiv.innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show">
                <h5>❌ Network Error</h5>
                <p class="mb-0">${error.message}</p>
                <small class="mt-1 d-block">Please check your connection and try again.</small>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    } finally {

        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Submit';
    }
});


async function loginUser(login, password) {
    const soapRequest = createLoginSoapRequest(login, password);
    const responseText = await sendSoapRequest(soapRequest, 'Login');
    return parseSoapResponse(responseText);
}

function createLoginSoapRequest(login, password) {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:urn="urn:ICUTech.Intf-IICUTech">
    <soap:Body>
        <urn:Login>
            <urn:UserName>${escapeXml(login)}</urn:UserName>
            <urn:Password>${escapeXml(password)}</urn:Password>
        </urn:Login>
    </soap:Body>
</soap:Envelope>`;
}

const CORS_PROXIES = [
    'https://cors-anywhere.herokuapp.com/',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://corsproxy.io/?',
    'https://thingproxy.freeboard.io/fetch/'
];

async function sendSoapRequest(soapRequest, action) {
    const targetUrl = 'http://isapi.mekashron.com/icu-tech/icutech-test.dll/soap/IICUTech';
    
    for (const proxy of CORS_PROXIES) {
        try {
            console.log(`Trying proxy: ${proxy}`);
            
            const proxyUrl = proxy + encodeURIComponent(targetUrl);
            const response = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': `urn:ICUTech.Intf-IICUTech#${action}`,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: soapRequest,
                timeout: 10000
            });
            
            if (response.ok) {
                const text = await response.text();
                console.log('Success with proxy:', proxy);
                return text;
            } else {
                console.warn(`Proxy ${proxy} returned status: ${response.status}`);
            }
        } catch (error) {
            console.warn(`Proxy ${proxy} failed:`, error.message);
            continue;
        }
    }
    
    throw new Error('All CORS proxies failed. Please try again later.');
}

function parseSoapResponse(xmlString) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
        

        const fault = xmlDoc.getElementsByTagName("faultstring")[0];
        if (fault) {
            return { 
                success: false, 
                error: `SOAP Error: ${fault.textContent || 'Unknown fault'}` 
            };
        }
        

        const resultElement = xmlDoc.getElementsByTagName("return")[0];
        if (!resultElement) {
            return { 
                success: false, 
                error: "Invalid response: No return data found" 
            };
        }
        
        const resultText = resultElement.textContent;
        
        try {
            const resultData = JSON.parse(resultText);
            

            if (resultData.ResultCode !== undefined && resultData.ResultCode !== 0) {
                return { 
                    success: false, 
                    error: resultData.ResultMessage || `Error code: ${resultData.ResultCode}` 
                };
            }
            
            return { 
                success: true, 
                data: resultData 
            };
            
        } catch (jsonError) {

            return { 
                success: true, 
                data: { rawResponse: resultText } 
            };
        }
        
    } catch (error) {
        return { 
            success: false, 
            error: `Failed to parse response: ${error.message}` 
        };
    }
}


function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}


function formatEntityDetails(data) {
    if (typeof data === 'string') {
        return data;
    }
    
    const formatted = {};
    

    for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined && value !== '') {
            formatted[key] = value;
        }
    }
    
    return JSON.stringify(formatted, null, 2);
}


async function registerTestAccount() {
    const email = `test${Date.now()}@test.com`;
    const password = 'Test123!';
    const messageDiv = document.getElementById('message');
    
    messageDiv.innerHTML = '<div class="alert alert-info">Creating test account...</div>';
    
    const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:urn="urn:ICUTech.Intf-IICUTech">
    <soap:Body>
        <urn:RegisterNewCustomer>
            <urn:Email>${escapeXml(email)}</urn:Email>
            <urn:Password>${escapeXml(password)}</urn:Password>
            <urn:FirstName>Test</urn:FirstName>
            <urn:LastName>User</urn:LastName>
            <urn:Mobile>+1234567890</urn:Mobile>
            <urn:CountryID>1</urn:CountryID>
            <urn:aID>0</urn:aID>
            <urn:SignupIP>127.0.0.1</urn:SignupIP>
        </urn:RegisterNewCustomer>
    </soap:Body>
</soap:Envelope>`;
    
    try {
        const responseText = await sendSoapRequest(soapRequest, 'RegisterNewCustomer');
        const result = parseSoapResponse(responseText);
        
        if (result.success) {
            messageDiv.innerHTML = `
                <div class="alert alert-success">
                    <h5>✅ Test Account Created!</h5>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Password:</strong> ${password}</p>
                    <small>Use these credentials to test login.</small>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="alert alert-danger">
                    <h5>❌ Registration Failed</h5>
                    <p>${result.error}</p>
                </div>
            `;
        }
    } catch (error) {
        messageDiv.innerHTML = `
            <div class="alert alert-danger">
                <h5>❌ Registration Error</h5>
                <p>${error.message}</p>
            </div>
        `;
    }
}


document.addEventListener('DOMContentLoaded', function() {
    const registerBtn = document.getElementById('registerTestBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', registerTestAccount);
    }
});

function fetchWithTimeout(url, options, timeout = 10000) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
    ]);
}