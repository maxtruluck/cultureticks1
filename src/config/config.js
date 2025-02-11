module.exports = {
    port: process.env.PORT || 5173,
    env: process.env.NODE_ENV || 'development',
    stripe: {
        publishableKey: 'pk_test_51PFeUs08ICGQBnkQs84W2LrHzvK4tCssK1O40306PsHLiWp5TDgxTp1YmE2mzYplGwD9YPmHFZD7JnYw9uYVb2Ua00AlGtHPUy',
        secretKey: 'sk_test_51PFeUs08ICGQBnkQ7pajT4IF6rhLOxdmc07mzH5LdyCsmgN6JoqfVdajhM5sVo4cvkQvr54uUfaLdwgDTYKroMhP004X7ywabt'
    }
};
